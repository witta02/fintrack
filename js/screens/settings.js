import { store } from "../store.js";
import { currencies, getCurrencyDisplayName } from "../currency.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";
import { supabase } from "../supabase.js";
import { router } from "../router.js";

export function renderSettings(container) {
  const selectedCurrency = store.getSelectedCurrency();
  const language = store.settings.language === "en" ? "en" : "th";
  const isEn = language === "en";
  const user = store.user;
  const currentTheme = store.settings.theme || (store.settings.isDarkMode ? "dark" : "light");
  const unlockedThemes = store.settings.unlockedThemes || ["light", "dark"];

  const currencyOptions = Object.values(currencies)
    .map(
      (curr) => `
      <option value="${curr.code}" ${selectedCurrency === curr.code ? "selected" : ""}>
        ${curr.symbol} — ${getCurrencyDisplayName(curr.code, language)}
      </option>
    `
    )
    .join("");

  const themeList = [
    { id: "dark", name: isEn ? 'Dark Pro' : 'โหมดมืด', color: '#0d1527', border: '#F5C842' },
    { id: "light", name: isEn ? 'Light Clean' : 'โหมดสว่าง', color: '#ffffff', border: '#cbd5e1' },
    { id: "midnight", name: isEn ? 'Midnight' : 'มิดไนท์', color: '#070b14', border: '#3b82f6' },
    { id: "cyberpunk", name: isEn ? 'Cyberpunk' : 'ไซเบอร์พังก์', color: '#13091f', border: '#ec4899' },
    { id: "gold", name: isEn ? 'Luxury Gold' : 'ทองคำหรูหรา', color: '#141108', border: '#eab308' },
  ];

  const renderThemeCard = (theme) => {
    const isLocked = !unlockedThemes.includes(theme.id);
    const isSelected = currentTheme === theme.id;
    return `
      <div class="theme-card-pill" data-theme-id="${theme.id}" data-locked="${isLocked}" style="flex-shrink: 0; padding: 8px 14px; border-radius: 999px; background: var(--surface); border: 1.5px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; ${isLocked ? 'opacity: 0.55;' : ''}">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: ${theme.color}; border: 1.5px solid ${theme.border};"></div>
        <div style="font-size: 12px; font-weight: 700; color: ${isSelected ? 'var(--gold)' : 'var(--text-primary)'}; white-space: nowrap;">
          ${theme.name}
        </div>
        ${isLocked ? `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        ` : (isSelected ? `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ` : '')}
      </div>
    `;
  };

  container.innerHTML = `
    <style>
      .settings-section-header {
        font-size: 11px;
        font-weight: 800;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin: 0 4px 10px 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .settings-card-group {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-2xl);
        margin-bottom: 20px;
        overflow: hidden;
        box-shadow: var(--card-shadow);
      }
      .settings-item-row {
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--border);
        transition: background 0.15s ease;
      }
      .settings-item-row:last-child {
        border-bottom: none;
      }
      .settings-item-clickable {
        cursor: pointer;
      }
      .settings-item-clickable:hover {
        background: var(--surface-hover);
      }
      .settings-icon-box {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
    </style>

    <div class="screen screen-enter settings-screen-wrap" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">
          ${t("settingsTitle")}
        </h1>
      </div>

      <!-- 1. User Profile & Supabase Database Account Card -->
      <div class="settings-card-group" style="padding: 18px 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--gold-soft); border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: var(--gold); flex-shrink: 0;">
              ${user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">
                ${user ? (user.user_metadata?.full_name || user.email.split('@')[0]) : (isEn ? 'Local Device User' : 'ผู้ใช้งานเครื่องนี้')}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: ${user ? 'var(--income)' : 'var(--text-muted)'};"></span>
                <span>${user ? (isEn ? 'Connected to Cloud Database' : 'เชื่อมต่อกับฐานข้อมูล Cloud แล้ว') : (isEn ? 'Encrypted Local Storage' : 'ข้อมูลบันทึกลงในเครื่อง')}</span>
              </div>
            </div>
          </div>

          <div>
            ${user ? `
              <button id="signout-btn" style="padding: 7px 12px; border-radius: var(--radius); background: var(--expense-soft); border: 1px solid var(--expense); color: var(--expense); font-size: 11.5px; font-weight: 800; cursor: pointer;">
                ${isEn ? 'Sign Out' : 'ออกจากระบบ'}
              </button>
            ` : `
              <button id="open-auth-btn" style="padding: 7px 14px; border-radius: var(--radius); background: var(--gold); border: none; color: #000; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: var(--btn-shadow);">
                ${isEn ? 'Sign In / Sync' : 'เข้าสู่ระบบ'}
              </button>
            `}
          </div>
        </div>

        ${user ? `
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">
              ${user.email}
            </div>
            <button id="change-pwd-btn" style="background: none; border: none; color: var(--gold); font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              ${isEn ? 'Change Password' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        ` : ''}
      </div>

      <!-- 2. Appearance & Themes -->
      <div class="settings-section-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        ${t("theme")}
      </div>
      <div class="settings-card-group" style="padding: 16px;">
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; font-weight: 600;">
          ${isEn ? 'Select your preferred visual style:' : 'เลือกธีมสีของแอปที่คุณชอบ:'}
        </div>
        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
          ${themeList.map(renderThemeCard).join('')}
        </div>
      </div>

      <!-- 3. Preferences (Language & Currency) -->
      <div class="settings-section-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        ${isEn ? 'Preferences' : 'ภาษา & สกุลเงิน'}
      </div>
      <div class="settings-card-group">
        <!-- Language Switcher -->
        <div class="settings-item-row">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${t("language")}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">${isEn ? 'English / ภาษาไทย' : 'ภาษาไทย / English'}</div>
            </div>
          </div>
          <div style="display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); padding: 3px; border-radius: 999px;">
            <button class="lang-switch-btn ${language === 'th' ? 'active' : ''}" data-lang="th" style="padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; border: none; cursor: pointer; background: ${language === 'th' ? 'var(--gold)' : 'transparent'}; color: ${language === 'th' ? '#000' : 'var(--text-secondary)'};">
              TH
            </button>
            <button class="lang-switch-btn ${language === 'en' ? 'active' : ''}" data-lang="en" style="padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; border: none; cursor: pointer; background: ${language === 'en' ? 'var(--gold)' : 'transparent'}; color: ${language === 'en' ? '#000' : 'var(--text-secondary)'};">
              EN
            </button>
          </div>
        </div>

        <!-- Currency Selector -->
        <div class="settings-item-row">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(16, 185, 129, 0.12); color: var(--income);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${t("currency")}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">${isEn ? 'Primary base display currency' : 'สกุลเงินหลักในการแสดงผล'}</div>
            </div>
          </div>
          <select id="currency-select" style="padding: 7px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 12px; font-weight: 700; max-width: 140px;">
            ${currencyOptions}
          </select>
        </div>
      </div>

      <!-- 4. System & Device -->
      <div class="settings-section-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
        ${isEn ? 'App & System' : 'ระบบ & การทำงาน'}
      </div>
      <div class="settings-card-group">
        <!-- Install App -->
        <div id="install-pwa-row" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(245, 200, 66, 0.12); color: var(--gold);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${isEn ? 'Install FinTrack App' : 'ติดตั้งแอปบนอุปกรณ์'}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">${isEn ? 'Add to Home Screen / Offline access' : 'เพิ่มลงหน้าจอหลักและใช้งานออฟไลน์'}</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><path d="m9 18 6-6-6-6"/></svg>
        </div>

        <!-- Push Notifications -->
        <div id="notify-test-row" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${isEn ? 'Push Notifications' : 'การแจ้งเตือน'}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">${isEn ? 'Daily reminders & bill alerts' : 'เตือนบันทึกและบิลที่ใกล้ถึงกำหนด'}</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><path d="m9 18 6-6-6-6"/></svg>
        </div>

        <!-- Reset App Data -->
        <div id="reset-data-row" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: var(--expense-soft); color: var(--expense);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--expense);">${isEn ? 'Reset All Data' : 'ล้างข้อมูลทั้งหมด'}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Erase local transactions and reset' : 'ลบข้อมูลและรีเซ็ตการตั้งค่า'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div style="text-align: center; color: var(--text-muted); font-size: 11px; font-weight: 600; padding: 12px 0 20px;">
        FinTrack v2.5.4 • Supabase Cloud Database Connected
      </div>
    </div>
  `;

  // Event Listeners
  // Theme Switching
  container.querySelectorAll(".theme-card-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const themeId = pill.getAttribute("data-theme-id");
      const isLocked = pill.getAttribute("data-locked") === "true";
      if (isLocked) {
        alerts.info(
          isEn ? "Locked Theme" : "ธีมนี้ยังไม่ได้ปลดล็อก",
          isEn ? "Earn FinCoins from logging transactions to unlock this theme in the Rewards Shop!" : "รับ FinCoins จากการบันทึกรายการเพื่อปลดล็อกธีมนี้ในร้านค้า!"
        );
        return;
      }
      store.setTheme(themeId);
      renderSettings(container);
    });
  });

  // Language Switch
  container.querySelectorAll(".lang-switch-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      store.setLanguage(lang);
      renderSettings(container);
    });
  });

  // Currency Switch
  container.querySelector("#currency-select")?.addEventListener("change", (e) => {
    store.setSelectedCurrency(e.target.value);
    alerts.success(isEn ? "Currency updated" : "เปลี่ยนสกุลเงินเรียบร้อยแล้ว");
  });

  // Auth & Signout
  container.querySelector("#open-auth-btn")?.addEventListener("click", () => {
    showAuthModal(container);
  });

  container.querySelector("#signout-btn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    store.setUser(null);
    alerts.success(isEn ? "Signed out successfully" : "ออกจากระบบเรียบร้อยแล้ว");
    renderSettings(container);
  });

  // Change Password
  container.querySelector("#change-pwd-btn")?.addEventListener("click", () => {
    showChangePasswordModal();
  });

  // PWA Install
  container.querySelector("#install-pwa-row")?.addEventListener("click", () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => {
        window.deferredPrompt = null;
      });
    } else {
      alerts.info(
        isEn ? "Add to Home Screen" : "ติดตั้งแอป",
        isEn ? "Tap your browser menu (••• or Share) and select 'Add to Home screen' or 'Install App'." : "แตะที่เมนูเบราว์เซอร์ (••• หรือ ปุ่มแชร์) แล้วเลือก 'เพิ่มลงในหน้าจอหลัก' หรือ 'ติดตั้งแอป'"
      );
    }
  });

  // Notifications
  container.querySelector("#notify-test-row")?.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alerts.error(isEn ? "Not Supported" : "ไม่รองรับ", isEn ? "Browser does not support notifications." : "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification("FinTrack", {
        body: isEn ? "Notifications are active! FinTrack is ready." : "ระบบแจ้งเตือนพร้อมใช้งาน! FinTrack ทำงานปกติ",
        icon: "/icons/icon-192x192.png",
      });
      alerts.success(isEn ? "Notification sent!" : "ส่งการแจ้งเตือนสำเร็จ!");
    } else {
      alerts.warning(isEn ? "Permission Denied" : "ไม่อนุญาต", isEn ? "Please enable notification permissions in browser settings." : "กรุณาเปิดการอนุญาตแจ้งเตือนในการตั้งค่าของเบราว์เซอร์");
    }
  });

  // Reset App Data
  container.querySelector("#reset-data-row")?.addEventListener("click", () => {
    alerts.confirm(
      isEn ? "Reset All Data?" : "ต้องการล้างข้อมูลทั้งหมด?",
      isEn ? "This will erase all local transactions and reset settings. This action cannot be undone." : "การกระทำนี้จะลบรายการทั้งหมดและรีเซ็ตการตั้งค่า และไม่สามารถกู้คืนได้",
      () => {
        store.resetAllData();
        alerts.success(isEn ? "Data reset complete" : "ล้างข้อมูลเรียบร้อยแล้ว");
        renderSettings(container);
      }
    );
  });
}

function showAuthModal(container) {
  const isEn = store.settings.language === "en";
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 360px; width: 90%; padding: 24px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${isEn ? 'Login' : 'เข้าสู่ระบบ'}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>

      <form id="auth-form" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">${isEn ? 'Email' : 'อีเมล'}</label>
          <input type="email" id="auth-email" required placeholder="user@example.com" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 600;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">${isEn ? 'Password' : 'รหัสผ่าน'}</label>
          <input type="password" id="auth-password" required placeholder="••••••••" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 600;" />
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 12px; border-radius: var(--radius); background: var(--gold); color: #000; font-weight: 800; font-size: 13px; border: none; cursor: pointer; box-shadow: var(--btn-shadow);">
          ${isEn ? 'Login' : 'เข้าสู่ระบบ'}
        </button>

        <div style="text-align: center; margin-top: 8px;">
          <button type="button" id="auth-forgot-password-btn" style="background: none; border: none; color: var(--gold); font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 4px;">
            ${isEn ? 'Forgot password? Click here' : 'ลืมรหัสผ่าน? คลิกที่นี่'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector("#auth-forgot-password-btn")?.addEventListener("click", async () => {
    close();
    const email = await alerts.promptForgotPassword();
    if (email) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        alerts.success(isEn ? "Password reset link sent! Check your email." : "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว! กรุณาตรวจสอบอีเมลของคุณ");
      } catch (err) {
        alerts.error(isEn ? "Failed to send reset link" : "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้", err.message);
      }
    }
  });

  modal.querySelector("#auth-form").onsubmit = async (e) => {
    e.preventDefault();
    const email = modal.querySelector("#auth-email").value.trim();
    const password = modal.querySelector("#auth-password").value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Try sign up if not found
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        store.setUser(signUpData.user);
        alerts.success(isEn ? "Registration successful!" : "ลงทะเบียนสำเร็จ!");
      } else {
        store.setUser(data.user);
        alerts.success(isEn ? "Signed in successfully!" : "เข้าสู่ระบบสำเร็จ!");
      }
      close();
      renderSettings(container);
    } catch (err) {
      alerts.error(isEn ? "Authentication Error" : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ", err.message);
    }
  };
}

function showChangePasswordModal() {
  const isEn = store.settings.language === "en";
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 360px; width: 90%; padding: 24px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${isEn ? 'Change Password' : 'เปลี่ยนรหัสผ่าน'}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>

      <form id="change-pwd-form" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">${isEn ? 'New Password' : 'รหัสผ่านใหม่'}</label>
          <input type="password" id="new-password" required minlength="6" placeholder="••••••••" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 600;" />
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 12px; border-radius: var(--radius); background: var(--gold); color: #000; font-weight: 800; font-size: 13px; border: none; cursor: pointer; box-shadow: var(--btn-shadow);">
          ${isEn ? 'Update Password' : 'อัปเดตรหัสผ่าน'}
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector("#change-pwd-form").onsubmit = async (e) => {
    e.preventDefault();
    const newPassword = modal.querySelector("#new-password").value;
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alerts.success(isEn ? "Password updated successfully!" : "เปลี่ยนรหัสผ่านสำเร็จ!");
      close();
    } catch (err) {
      alerts.error(isEn ? "Error" : "เกิดข้อผิดพลาด", err.message);
    }
  };
}
