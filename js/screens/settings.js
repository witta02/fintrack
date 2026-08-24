import { store } from "../store.js";
import { currencies, getCurrencyDisplayName } from "../currency.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";
import { supabase } from "../supabase.js";
import { router } from "../router.js";

export function renderSettings(container) {
  const selectedCurrency = store.getSelectedCurrency();
  const language = store.settings.language === "en" ? "en" : "th";
  const user = store.user;
  const level = store.settings.level || 1;
  const currentTheme = store.settings.theme || (store.settings.isDarkMode ? "dark" : "light");
  const unlockedThemes = store.settings.unlockedThemes || ["light", "dark"];
  const wallets = store.getWallets();

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
    { id: "dark", name: language === 'en' ? 'Dark Pro' : 'มืด Pro', color: '#0d1527', border: '#F5C842' },
    { id: "light", name: language === 'en' ? 'Light Clean' : 'สว่าง Clean', color: '#ffffff', border: '#cbd5e1' },
    { id: "midnight", name: language === 'en' ? 'Midnight' : 'มิดไนท์', color: '#070b14', border: '#3b82f6' },
    { id: "cyberpunk", name: language === 'en' ? 'Cyberpunk' : 'ไซเบอร์พังก์', color: '#13091f', border: '#ec4899' },
    { id: "gold", name: language === 'en' ? 'Luxury Gold' : 'ทองหรูหรา', color: '#141108', border: '#eab308' },
  ];

  const renderThemeCard = (theme) => {
    const isLocked = !unlockedThemes.includes(theme.id);
    const isSelected = currentTheme === theme.id;
    return `
      <div class="theme-card-pill" data-theme-id="${theme.id}" data-locked="${isLocked}" style="flex-shrink: 0; padding: 10px 14px; border-radius: 14px; background: var(--surface); border: 2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; ${isLocked ? 'opacity: 0.55;' : ''}">
        <div style="width: 16px; height: 16px; border-radius: 50%; background: ${theme.color}; border: 1.5px solid ${theme.border}; box-shadow: 0 0 6px ${theme.border}40;"></div>
        <div style="font-size: 12px; font-weight: 700; color: ${isSelected ? 'var(--gold)' : 'var(--text-primary)'}; white-space: nowrap;">
          ${theme.name}
        </div>
        ${isLocked ? `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        ` : (isSelected ? `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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
        margin: 0 4px 8px 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .settings-card-group {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-xl);
        margin-bottom: 20px;
        overflow: hidden;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
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
        background: rgba(255, 255, 255, 0.025);
      }
      .settings-item-clickable:active {
        background: var(--surface);
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

    <div class="screen screen-enter" style="padding: 0 16px 36px;">
      
      <!-- Top Title Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0; color: var(--text-primary);">
          ${t("settingsTitle")}
        </h1>
        <span style="background: var(--gold-soft); color: var(--gold); border: 1px solid var(--gold-glow); font-size: 10.5px; font-weight: 800; padding: 3px 10px; border-radius: 999px;">
          v3.0 PRO
        </span>
      </div>

      <!-- 1. Profile & Account Card -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 18px; margin-bottom: 22px; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <!-- Avatar -->
          <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--gold), var(--amber)); display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: 900; color: #000; flex-shrink: 0; box-shadow: 0 4px 12px rgba(245,200,66,0.3);">
            ${user ? user.email.charAt(0).toUpperCase() : `
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            `}
          </div>

          <!-- User Info & Status Badges -->
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${user ? user.email.split('@')[0] : (language === 'en' ? 'Guest Account' : 'บัญชีผู้ใช้ทั่วไป')}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${user ? user.email : (language === 'en' ? 'Local storage only' : 'บันทึกข้อมูลในเครื่องเท่านั้น')}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
              <button id="profile-level-badge" style="background: rgba(245,200,66,0.12); border: 1px solid rgba(245,200,66,0.3); border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 800; color: var(--gold); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                ⭐ Lv.${level}
              </button>
              ${user ? `
                <span style="font-size: 10px; font-weight: 700; background: rgba(16, 185, 129, 0.12); color: var(--income); border: 1px solid rgba(16, 185, 129, 0.25); padding: 2px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px;">
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--income);"></span>
                  Cloud Sync Active
                </span>
              ` : `
                <span style="font-size: 10px; font-weight: 700; background: rgba(255, 255, 255, 0.06); color: var(--text-muted); border: 1px solid var(--border); padding: 2px 8px; border-radius: 999px;">
                  Offline / Local
                </span>
              `}
            </div>
          </div>
        </div>

        <!-- Action Row -->
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
          ${user ? `
            <button id="auth-changepwd-btn" style="flex: 1; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); padding: 8px 12px; border-radius: 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>${t('changePassword')}</span>
            </button>
            <button id="auth-signout-btn" style="border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.06); color: var(--expense); padding: 8px 14px; border-radius: 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>${t('signOut')}</span>
            </button>
          ` : `
            <button id="auth-login-btn" class="btn-primary" style="width: 100%; padding: 10px 14px; font-size: 12.5px; font-weight: 800; border-radius: 10px; cursor: pointer; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; border: none; box-shadow: var(--shadow-gold); display: flex; align-items: center; justify-content: center; gap: 8px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              <span>${language === 'en' ? 'Sign In / Sync Data' : 'เข้าสู่ระบบ / ซิงค์ข้อมูลข้ามเครื่อง'}</span>
            </button>
          `}
        </div>
      </div>

      <!-- 2. Financial Modules & Features Group -->
      <div class="settings-section-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
        <span>${language === 'en' ? 'Financial Features' : 'ฟีเจอร์ทางการเงิน'}</span>
      </div>
      <div class="settings-card-group">
        
        <!-- Wallets Management -->
        <div id="wallets-row-btn" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(245, 200, 66, 0.12); color: var(--gold);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">
                ${language === 'en' ? 'Manage Wallets' : 'จัดการกระเป๋าเงิน (Wallets)'}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                ${language === 'en' ? `${wallets.length} active pockets configured` : `ตั้งค่าแล้ว ${wallets.length} กระเป๋า`}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; font-weight: 800; background: var(--surface); color: var(--gold); border: 1px solid var(--border); padding: 2px 8px; border-radius: 999px;">
              ${wallets.length}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </div>

        <!-- Trader Mode Toggle -->
        <div class="settings-item-row">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(99, 102, 241, 0.12); color: #818cf8;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">
                  ${language === 'en' ? 'Trader Mode' : 'โหมดเทรดเดอร์ (Trader Mode)'}
                </span>
                <span style="font-size: 9px; font-weight: 800; background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 1px 6px; border-radius: 4px;">LIVE</span>
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                ${language === 'en' ? 'Stock & crypto portfolio tracker' : 'ติดตามพอร์ตหุ้น คริปโต & ราคาตลาดสด'}
              </div>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-trader-mode" ${store.settings.isTraderMode ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- Net Worth Card Toggle -->
        <div class="settings-item-row">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(245, 158, 11, 0.12); color: var(--amber);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${t("showNetWorthCard")}</div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${t("showNetWorthCardHint")}</div>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-networth-card" ${store.settings.showNetWorthCard !== false ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- Tax Settings Calculator -->
        <div id="tax-row-wrapper" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(239, 68, 68, 0.12); color: var(--expense);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M12 10h3"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${t("taxSettings")}</div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                ${language === 'en' ? 'Personal deductions & tax planner' : 'ตั้งค่าลดหย่อนภาษี & คำนวณรายปี'}
              </div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </div>

        <!-- Split Bill Feature Navigation -->
        <div id="split-bill-row-btn" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(16, 185, 129, 0.12); color: var(--income);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">
                ${language === 'en' ? 'Split Bill Calculator' : 'หารบิล / แบ่งค่าใช้จ่าย (Split Bill)'}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                ${language === 'en' ? 'Share expenses with friends' : 'แบ่งจ่ายค่าทริป / มื้ออาหารกับเพื่อน'}
              </div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>

      <!-- 3. Appearance & Preferences Group -->
      <div class="settings-section-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        <span>${t('personalize')}</span>
      </div>
      <div class="settings-card-group">
        
        <!-- Themes Row -->
        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="settings-icon-box" style="width: 28px; height: 28px; background: rgba(245, 200, 66, 0.12); color: var(--gold);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
              </div>
              <span style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${t('appTheme')}</span>
            </div>
            <button id="rewards-theme-link" style="background: none; border: none; font-size: 11px; font-weight: 700; color: var(--gold); cursor: pointer;">
              ${language === 'en' ? 'Unlock Themes 🎁' : 'ปลดล็อคธีม 🎁'}
            </button>
          </div>
          <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
            ${themeList.map(renderThemeCard).join('')}
          </div>
        </div>

        <!-- Language Switcher -->
        <div class="settings-item-row">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(139, 92, 246, 0.12); color: #a78bfa;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${t("language")}</div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${language === 'en' ? 'App language' : 'ภาษาที่แสดงในระบบ'}</div>
            </div>
          </div>
          <div style="display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 2px;">
            <button type="button" id="language-th-btn" style="padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; border: none; background: ${language === 'th' ? 'linear-gradient(135deg, var(--gold), var(--amber))' : 'transparent'}; color: ${language === 'th' ? '#000' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s ease;">TH</button>
            <button type="button" id="language-en-btn" style="padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; border: none; background: ${language === 'en' ? 'linear-gradient(135deg, var(--gold), var(--amber))' : 'transparent'}; color: ${language === 'en' ? '#000' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s ease;">EN</button>
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
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${language === 'en' ? 'Base display currency' : 'สกุลเงินหลักที่ใช้คำนวณ'}</div>
            </div>
          </div>
          <select id="setting-currency-select" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); font-size: 12.5px; font-weight: 700; padding: 7px 12px; border-radius: 10px; outline: none; cursor: pointer; max-width: 140px;">
            ${currencyOptions}
          </select>
        </div>
      </div>

      <!-- 4. Data Management & Backup Group -->
      <div class="settings-section-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>${language === 'en' ? 'Data & Backup' : 'ข้อมูลและการสำรอง'}</span>
      </div>
      <div class="settings-card-group">
        
        <!-- Export Reports -->
        <div id="export-reports-row-btn" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(59, 130, 246, 0.12); color: #60a5fa;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">
                ${language === 'en' ? 'Export Data & Reports' : 'ส่งออกข้อมูลและรายงาน (Export)'}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                ${language === 'en' ? 'Download CSV, Excel or JSON backups' : 'ดาวน์โหลดรายงานสรุปเป็น CSV, Excel หรือ JSON'}
              </div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </div>

        <!-- Danger: Delete Cloud Backup (Only logged in) -->
        ${user ? `
          <div class="settings-item-row">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="settings-icon-box" style="background: rgba(239, 68, 68, 0.1); color: var(--expense);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <div>
                <div style="font-size: 13.5px; font-weight: 700; color: var(--expense);">${t('deleteCloudBackup')}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${language === 'en' ? 'Erase cloud synchronized data' : 'ลบข้อมูลสำรองบนคลาวด์'}</div>
              </div>
            </div>
            <button id="delete-cloud-data-btn" style="border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.06); color: var(--expense); padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer;">
              ${language === 'en' ? 'Delete' : 'ลบข้อมูล'}
            </button>
          </div>
        ` : ''}
      </div>

      <!-- 5. System & About Group -->
      <div class="settings-section-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>${t('systemStuff')}</span>
      </div>
      <div class="settings-card-group">
        
        <!-- PWA Install -->
        <div id="install-app-btn" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(245, 200, 66, 0.12); color: var(--gold);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${t("installbtn")}</div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${language === 'en' ? 'Install native web app for offline access' : 'ติดตั้งเว็บแอปเพื่อใช้งานแบบออฟไลน์'}</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </div>

        <!-- Push Notifications Test -->
        <div id="test-notify-btn" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(59, 130, 246, 0.12); color: #60a5fa;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${t("notitestbtn")}</div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${language === 'en' ? 'Send sample reminder notification' : 'ส่งการแจ้งเตือนทดสอบเข้าเครื่อง'}</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </div>

        <!-- Reset App Data -->
        <div id="clear-notify-btn" class="settings-item-row settings-item-clickable">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="settings-icon-box" style="background: rgba(239, 68, 68, 0.1); color: var(--expense);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--expense);">${t("clearbtn")}</div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${language === 'en' ? 'Reset local storage data' : 'ล้างข้อมูลที่บันทึกในเครื่องทั้งหมด'}</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>

      <!-- App Footer / Version -->
      <div style="text-align: center; padding: 16px 0 10px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <div style="font-family: var(--font-heading); font-weight: 900; font-size: 15px; letter-spacing: -0.3px; background: linear-gradient(135deg, var(--gold-light), var(--amber)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          FinTrack 3.0 Pro
        </div>
        <div style="font-size: 10.5px; color: var(--text-muted); font-weight: 600;">
          Smart Personal Finance & Portfolio Tracker
        </div>
      </div>
    </div>
  `;

  setupEventListeners(container);
}

function setupEventListeners(container) {
  // Theme options listener
  container.querySelectorAll(".theme-card-pill").forEach(el => {
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

  // Level badge -> Achievements
  container.querySelector("#profile-level-badge")?.addEventListener("click", () => {
    router.navigate("achievements");
  });

  // Rewards theme link -> Rewards screen
  container.querySelector("#rewards-theme-link")?.addEventListener("click", () => {
    router.navigate("rewards");
  });

  // Currency select
  container.querySelector("#setting-currency-select")?.addEventListener("change", (e) => {
    store.setCurrency(e.target.value);
  });

  // Wallets navigation
  container.querySelector("#wallets-row-btn")?.addEventListener("click", () => {
    router.navigate("wallets");
  });

  // Split bill navigation
  container.querySelector("#split-bill-row-btn")?.addEventListener("click", () => {
    router.navigate("splitBill");
  });

  // Export reports navigation
  container.querySelector("#export-reports-row-btn")?.addEventListener("click", () => {
    router.navigate("export");
  });

  // Trader mode toggle
  const toggleTrader = container.querySelector("#toggle-trader-mode");
  if (toggleTrader) {
    toggleTrader.addEventListener("change", (e) => {
      store.setTraderMode(e.target.checked);
      alerts.success(
        e.target.checked 
          ? (store.settings.language === 'en' ? 'Trader Mode Activated 📈' : 'เปิดใช้งานโหมดเทรดเดอร์แล้ว 📈')
          : (store.settings.language === 'en' ? 'Trader Mode Deactivated' : 'ปิดใช้งานโหมดเทรดเดอร์แล้ว')
      );
    });
  }

  // Net worth card toggle
  const toggleNetWorth = container.querySelector("#toggle-networth-card");
  if (toggleNetWorth) {
    toggleNetWorth.addEventListener("change", (e) => {
      store.settings.showNetWorthCard = e.target.checked;
      store.save();
    });
  }

  // Language TH
  container.querySelector("#language-th-btn")?.addEventListener("click", () => {
    store.setLanguage("th");
    updateNavLabels();
    renderSettings(container);
  });

  // Language EN
  container.querySelector("#language-en-btn")?.addEventListener("click", () => {
    store.setLanguage("en");
    updateNavLabels();
    renderSettings(container);
  });

  // PWA Install
  container.querySelector("#install-app-btn")?.addEventListener("click", () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => {
        window.deferredPrompt = null;
      });
    } else {
      alerts.info(t("installPwaHint"));
    }
  });

  // Test notification
  container.querySelector("#test-notify-btn")?.addEventListener("click", () => {
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

  // Tax modal
  container.querySelector("#tax-row-wrapper")?.addEventListener("click", () => {
    showTaxSettings(container);
  });

  // Reset app data
  container.querySelector("#clear-notify-btn")?.addEventListener("click", async () => {
    const isConfirmed = await alerts.confirmReset(
      t('resetAppDataTitle'),
      t("resetAppConfirm"),
    );
    if (isConfirmed) {
      localStorage.clear();
      window.location.reload();
    }
  });

  // Sign out
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

  // Change password
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

  // Delete cloud data
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

  // Login button
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
    <div class="modal-dialog" style="max-width: 460px; padding: 24px; text-align: left; background: var(--card-solid); border: 1px solid var(--border); border-radius: var(--radius-xl);">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h3 class="modal-title" style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">${t("taxSettingsTitle")}</h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <div style="padding-top: 4px; max-height: 420px; overflow-y: auto; padding-right: 4px;">
        <p style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5; text-align: left;">
          ${t("taxSettingsContext")}
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">${t('taxPersonalLabel')}</label>
            <input type="number" id="tax-personal" class="tax-calc-input" style="width: 100%; font-size: 13px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${personal}" placeholder="60000" />
            <small style="color: var(--text-muted); font-size: 10px; display: block; margin-top: 3px;">${t("taxPersonalDeductionHint")}</small>
          </div>
          
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">${t('taxSocialSecurityLabel')}</label>
            <input type="number" id="tax-ssf" class="tax-calc-input" style="width: 100%; font-size: 13px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${ssf}" placeholder="9000" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">${t('taxProvidentFundLabel')}</label>
            <input type="number" id="tax-pvd" class="tax-calc-input" style="width: 100%; font-size: 13px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${pvd}" placeholder="0" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">${t('taxMutualFundsLabel')}</label>
            <input type="number" id="tax-mf" class="tax-calc-input" style="width: 100%; font-size: 13px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${mf}" placeholder="0" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">${t('taxOtherDeductionsLabel')}</label>
            <input type="number" id="tax-other" class="tax-calc-input" style="width: 100%; font-size: 13px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${other}" placeholder="0" />
          </div>
        </div>

        <div style="background: rgba(245, 200, 66, 0.08); padding: 12px 14px; border-radius: 12px; border: 1.5px dashed rgba(245, 200, 66, 0.3); margin-top: 16px; display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 12px; color: var(--gold);">${t('taxTotalDeductions')}</strong>
          <strong style="font-size: 15px; color: var(--gold);" id="tax-total-deduction-display">฿0.00</strong>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="modal-cancel-btn" style="flex:1; border: 1px solid var(--border); padding: 12px; border-radius: 12px; color: var(--text-secondary); background: var(--surface); font-weight: 700; cursor: pointer;">${t("cancel")}</button>
        <button class="btn-primary modal-save-btn" style="flex:1; padding: 12px; border-radius: 12px; font-weight: 800; cursor: pointer; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; border: none; box-shadow: var(--shadow-gold);">${t("save")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const calculateTotal = () => {
    const personalVal = parseFloat(modal.querySelector("#tax-personal").value) || 0;
    const ssfVal = parseFloat(modal.querySelector("#tax-ssf").value) || 0;
    const pvdVal = parseFloat(modal.querySelector("#tax-pvd").value) || 0;
    const mfVal = parseFloat(modal.querySelector("#tax-mf").value) || 0;
    const otherVal = parseFloat(modal.querySelector("#tax-other").value) || 0;
    const total = personalVal + ssfVal + pvdVal + mfVal + otherVal;

    const totalDisplay = store.toDisplay(total);
    modal.querySelector("#tax-total-deduction-display").textContent =
      `${store.getCurrencySymbol()}${totalDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  modal.querySelectorAll(".tax-calc-input").forEach((inp) => {
    inp.addEventListener("input", calculateTotal);
  });
  calculateTotal();

  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-cancel-btn").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  modal.querySelector(".modal-save-btn").onclick = () => {
    const personalVal = parseFloat(modal.querySelector("#tax-personal").value) || 0;
    const ssfVal = parseFloat(modal.querySelector("#tax-ssf").value) || 0;
    const pvdVal = parseFloat(modal.querySelector("#tax-pvd").value) || 0;
    const mfVal = parseFloat(modal.querySelector("#tax-mf").value) || 0;
    const otherVal = parseFloat(modal.querySelector("#tax-other").value) || 0;

    store.updateTaxDeduction(personalVal, ssfVal, pvdVal, mfVal, otherVal);
    close();
    alerts.success(t("taxSaveSuccess"));
    
    // Update dashboard UI if needed
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
