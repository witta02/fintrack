import { store } from "../store.js";
import { currencies } from "../currency.js";
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
      ${curr.symbol} — ${curr.name}
    </option>
  `,
    )
    .join("");

  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 22px;">
      <h1 class="brand-title" style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px;">${t("settingsTitle")}</h1>
      <span class="premium-badge">v2.70</span>
    </div>

    <!-- ── General ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t("generalSettings")}</div>
    <div class="card general-settings-card" style="padding: 8px 14px; margin-bottom: 20px;">

      <!-- Dark Mode -->
      ${settingRow(
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>`,
        "rgba(245,200,66,0.15)",
        t("darkMode"),
        t("swhtodarktxt"),
        `<label class="switch-toggle">
           <input type="checkbox" id="setting-darkmode-chk" ${isDarkMode ? "checked" : ""} />
           <span class="switch-slider"></span>
         </label>`,
      )}

      <div style="height: 1px; background: var(--border); margin: 4px 0;"></div>

      <!-- Language -->
      ${settingRow(
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`,
        "rgba(124,92,252,0.15)",
        t("language"),
        t("languageHint"),
        `<div style="display: flex; gap: 6px;">
           <button type="button" id="language-th-btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1.5px solid ${language === "th" ? "var(--gold)" : "var(--border)"}; background: ${language === "th" ? "rgba(245,200,66,0.12)" : "var(--surface)"}; color: ${language === "th" ? "var(--gold)" : "var(--text-secondary)"}; transition: all var(--transition);">
             <svg width="16" height="12" viewBox="0 0 9 6" style="border-radius: 2px;">
               <rect width="9" height="6" fill="#A51931"/>
               <rect y="1" width="9" height="4" fill="#F4F5F8"/>
               <rect y="2" width="9" height="2" fill="#2D2A4A"/>
             </svg>
             TH
           </button>
           <button type="button" id="language-en-btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1.5px solid ${language === "en" ? "var(--gold)" : "var(--border)"}; background: ${language === "en" ? "rgba(245,200,66,0.12)" : "var(--surface)"}; color: ${language === "en" ? "var(--gold)" : "var(--text-secondary)"}; transition: all var(--transition);">
             <svg width="16" height="12" viewBox="0 0 50 30" style="border-radius: 2px;">
               <rect width="50" height="30" fill="#012169"/>
               <path d="M0 0 L50 30 M50 0 L0 30" stroke="#FFF" stroke-width="6"/>
               <path d="M0 0 L50 30 M50 0 L0 30" stroke="#C8102E" stroke-width="4"/>
               <path d="M25 0 V30 M0 15 H50" stroke="#FFF" stroke-width="10"/>
               <path d="M25 0 V30 M0 15 H50" stroke="#C8102E" stroke-width="6"/>
             </svg>
             EN
           </button>
         </div>`,
      )}
    </div>

    <!-- ── Currency & Tax Section (Responsive Grid) ── -->
    <div class="section-eyebrow desktop-only" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">สกุลเงินและภาษี</div>
    <div class="currency-tax-grid">
      <div class="currency-col">
        <div class="section-eyebrow mobile-only" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t("currency")}</div>
        <div class="card" style="padding: 14px; margin-bottom: 20px; height: calc(100% - 28px); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div class="setting-icon-badge" style="background: rgba(52,211,153,0.15);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--income);"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t("currency")}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">${t("chgcurtxt")}</div>
            </div>
          </div>
          <select id="setting-currency-select" class="form-control" style="font-size: 14px; margin-top: auto;">
            ${currencyOptions}
          </select>
        </div>
      </div>

      <div class="tax-col">
        <div class="section-eyebrow mobile-only" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t("taxSettings")}</div>
        <div class="card" style="padding: 8px 14px; margin-bottom: 20px; height: calc(100% - 28px); display: flex; align-items: center;">
          <div id="tax-row-wrapper" style="cursor: pointer; width: 100%;">
            ${settingRow(
              `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--expense);"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M12 10h3"/></svg>`,
              "rgba(248,113,113,0.15)",
              t("taxSettings"),
              t("taxSettingsDesc"),
              `<button id="setting-tax-btn" style="
                display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
                background: rgba(245,200,66,0.08); color: var(--gold);
                border: 1px solid rgba(245,200,66,0.22);
                border-radius: 8px; cursor: pointer;
                transition: all var(--transition);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>`,
            )}
          </div>
        </div>
      </div>
    </div>

    <!-- ── Notifications ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t("notificationSystem")}</div>
    <div class="card" style="padding: 14px; margin-bottom: 20px;">
      <div style="display: flex; gap: 10px;">
        <button id="test-notify-btn" style="
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: rgba(245,200,66,0.08); color: var(--gold);
          border: 1px solid rgba(245,200,66,0.22); padding: 11px;
          border-radius: 12px; font-size: 13px; font-weight: 700; transition: all var(--transition);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          ${t("notitestbtn")}
        </button>
        <button id="clear-notify-btn" style="
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: rgba(248,113,113,0.07); color: var(--expense);
          border: 1px solid rgba(248,113,113,0.22); padding: 11px;
          border-radius: 12px; font-size: 13px; font-weight: 700; transition: all var(--transition);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          ${t("clearbtn")}
        </button>
      </div>
    </div>

    <!-- ── Install ───────────────────────────────── -->
    <div class="card" style="
      padding: 18px; margin-bottom: 20px;
      border: 1.5px dashed rgba(245,200,66,0.35);
      background: linear-gradient(135deg, rgba(245,200,66,0.05), var(--card));
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div class="setting-icon-badge" style="background: rgba(245,200,66,0.15); display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
            <polyline points="8 12 12 16 16 12"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
          </svg>
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 700; color: var(--gold);">${t("installbtn")}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px; line-height: 1.5;">${t("installtxt")}</div>
        </div>
      </div>
      <button id="install-app-btn" class="btn-primary" style="padding: 12px; font-size: 13px; border-radius: 12px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        ${t("installbtn")}
      </button>
    </div>

    <!-- Security & Privacy Card -->
    <div class="card" style="padding: 18px; margin-bottom: 20px; border: 1px solid var(--border); border-radius: 16px; background: var(--card);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
        <div class="setting-icon-badge" style="background: rgba(52, 211, 153, 0.12); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--income);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${store.settings.language === 'en' ? 'Security & Privacy' : 'ความปลอดภัยและความเป็นส่วนตัว'}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
            ${store.settings.language === 'en' ? 'Your financial data is protected' : 'ข้อมูลทางการเงินของคุณได้รับการคุ้มครองอย่างปลอดภัย'}
          </div>
        </div>
      </div>
      
      <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; text-align: left; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 14px;">
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: var(--income); font-weight: bold;">✓</span>
          <span>${store.settings.language === 'en' ? 'HTTPS/SSL encrypted connection to the database.' : 'การเชื่อมต่อไปยังฐานข้อมูลคลาวด์ถูกเข้ารหัสความปลอดภัย (HTTPS/SSL)'}</span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: var(--income); font-weight: bold;">✓</span>
          <span>${store.settings.language === 'en' ? 'Row Level Security (RLS) active: Only you can access your records.' : 'เปิดใช้งานระบบปกป้องสิทธิ์ผู้ใช้ (RLS): ไม่มีผู้ใดสามารถเห็นข้อมูลของคุณได้นอกจากตัวคุณเอง'}</span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: var(--income); font-weight: bold;">✓</span>
          <span>${store.settings.language === 'en' ? 'Full data ownership: Purge your cloud records at any time.' : 'สิทธิ์ควบคุมข้อมูล 100%: คุณสามารถเลือกที่จะลบข้อมูลที่จัดเก็บในคลาวด์ได้ตลอดเวลา'}</span>
        </div>
      </div>

      ${store.user ? `
        <button id="delete-cloud-data-btn" class="btn-primary" style="background: rgba(239, 68, 68, 0.08); border: 1.5px solid rgba(239, 68, 68, 0.25); color: var(--expense); padding: 12px; font-size: 13px; font-weight: 700; border-radius: 12px; cursor: pointer; transition: all var(--transition); display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: none;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          ${store.settings.language === 'en' ? 'Delete Cloud Database Backup' : 'ลบข้อมูลฐานข้อมูลบน Cloud'}
        </button>
      ` : `
        <div style="font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center;">
          ${store.settings.language === 'en' ? 'Log in to manage your cloud database options.' : 'เข้าสู่ระบบเพื่อจัดการตัวเลือกความปลอดภัยและฐานข้อมูลคลาวด์'}
        </div>
      `}
    </div>

    <!-- AI Assistant Configuration -->
    <div class="card" style="padding: 18px; margin-bottom: 20px; border: 1px solid var(--border); border-radius: 16px; background: var(--card);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
        <div class="setting-icon-badge" style="background: rgba(245, 184, 0, 0.12); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--gold);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${store.settings.language === 'en' ? 'AI Assistant (Finny)' : 'ตัวช่วยอัจฉริยะ (Finny)'}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
            ${store.settings.language === 'en' ? 'Configure Google Gemini API' : 'ตั้งค่ารหัสความปลอดภัยของ Google Gemini API'}
          </div>
        </div>
      </div>
      
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label" style="font-size: 11px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span>${store.settings.language === 'en' ? 'Gemini API Key' : 'รหัส API Key ของ Gemini'}</span>
          <a href="https://aistudio.google.com/" target="_blank" style="color: var(--gold); text-decoration: none; font-weight: 700; font-size: 10px;">${store.settings.language === 'en' ? 'Get Free Key ↗' : 'รับรหัสฟรี ↗'}</a>
        </label>
        <div style="position: relative; display: flex; align-items: center;">
          <input type="password" id="setting-gemini-key-input" class="form-control" style="font-size: 12px; padding: 10px 40px 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); width: 100%;" value="${store.settings.geminiApiKey || ''}" placeholder="AQ.Ab8RN..." />
          <button id="toggle-gemini-key-visibility" type="button" style="position: absolute; right: 10px; background: none; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <small style="color: var(--text-secondary); font-size: 10px; display: block; margin-top: 6px; line-height: 1.4;">
          ${store.settings.language === 'en' 
            ? '* Leave blank to use the default embedded API key or offline rules.' 
            : '* เว้นว่างไว้เพื่อใช้งานรหัส API เริ่มต้นของระบบ หรือใช้งานระบบถอดความแบบออฟไลน์'}
        </small>
      </div>
    </div>

    <!-- Cloud Account & Sync -->
    <div class="card ${store.user ? 'profile-card-logged-in' : ''}" style="padding: 18px; margin-bottom: 20px; border-radius: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="setting-icon-badge" style="background: rgba(255, 184, 0, 0.12); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--gold);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${store.user ? t('profile') : t('signIn') + ' / ' + t('signUp')}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
              ${store.user ? store.user.email : 'เข้าสู่ระบบเพื่อบันทึกข้อมูลบน Cloud'}
            </div>
          </div>
        </div>
        ${store.user
          ? `<div style="display: flex; gap: 8px;">
              <button id="auth-changepwd-btn" class="btn-primary" style="background: rgba(255, 184, 0, 0.08); border: 1.5px solid rgba(255, 184, 0, 0.25); color: var(--gold); padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 10px; cursor: pointer; transition: all var(--transition); white-space: nowrap; box-shadow: none;">
                ${store.settings.language === 'en' ? 'Change Password' : 'เปลี่ยนรหัสผ่าน'}
              </button>
              <button id="auth-signout-btn" class="btn-primary" style="background: #ef4444; border-color: #ef4444; color: #fff; padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 10px; cursor: pointer; transition: all var(--transition); box-shadow: none;">
                ${t('signOut')}
              </button>
             </div>`
          : `<button id="auth-login-btn" class="btn-primary" style="padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 10px; cursor: pointer; transition: all var(--transition); white-space: nowrap;">
              ${t('signIn')} / ${t('signUp')}
            </button>`
        }
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 8px 0 4px; display: flex; flex-direction: column; gap: 4px;">
      <div style="font-family: var(--font-heading); font-weight: 800; font-size: 14px; background: linear-gradient(135deg, var(--gold-light), var(--amber)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">FinTrack</div>
      <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 0.5px;">Version 2.70</div>
    </div>
  `;

  setupEventListeners(container);
}

function setupEventListeners(container) {
  container
    .querySelector("#setting-darkmode-chk")
    .addEventListener("change", () => {
      store.toggleTheme();
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
        store.settings.language === "en"
          ? "Reset App Data?"
          : "ยืนยันการรีเซ็ตข้อมูล?",
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
            store.settings.language === 'en' ? 'Update Failed' : 'อัปเดตล้มเหลว',
            error.message
          );
        } else {
          alerts.success(
            store.settings.language === 'en' ? 'Success' : 'สำเร็จ',
            store.settings.language === 'en' ? 'Password updated successfully!' : 'เปลี่ยนรหัสผ่านเสร็จเรียบร้อยแล้ว!'
          );
        }
      }
    });
  }

  const deleteCloudBtn = container.querySelector("#delete-cloud-data-btn");
  if (deleteCloudBtn) {
    deleteCloudBtn.addEventListener("click", async () => {
      const isConfirmed = await alerts.confirmReset(
        store.settings.language === "en" ? "Delete Cloud Backup?" : "ลบข้อมูลสำรองบนคลาวด์?",
        store.settings.language === "en" 
          ? "This will permanently delete all your financial records from Supabase database. Your local offline data will remain." 
          : "การดำเนินการนี้จะลบข้อมูลธุรกรรมทั้งหมดของคุณออกจากเซิร์ฟเวอร์คลาวด์ถาวร โดยข้อมูลธุรกรรมในเครื่องนี้จะไม่ถูกลบ"
      );
      if (isConfirmed) {
        try {
          await store.deleteCloudData();
          alerts.success(
            store.settings.language === "en" ? "Deleted Successfully" : "ลบข้อมูลสำเร็จ",
            store.settings.language === "en" 
              ? "All cloud data has been deleted." 
              : "ข้อมูลของคุณบนคลาวด์ได้รับการลบออกเสร็จสิ้น"
          );
        } catch (err) {
          alerts.error(
            store.settings.language === "en" ? "Deletion Failed" : "ลบข้อมูลล้มเหลว",
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

  const geminiInput = container.querySelector("#setting-gemini-key-input");
  if (geminiInput) {
    geminiInput.addEventListener("change", (e) => {
      store.settings.geminiApiKey = e.target.value.trim();
      store.save();
    });
    
    const toggleBtn = container.querySelector("#toggle-gemini-key-visibility");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const isPassword = geminiInput.type === "password";
        geminiInput.type = isPassword ? "text" : "password";
        toggleBtn.innerHTML = isPassword 
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      });
    }
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
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${lang === "en" ? "Personal Deduction (Standard)" : "ค่าลดหย่อนส่วนบุคคล (ทั่วไป)"}</label>
            <input type="number" id="tax-personal" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${personal}" placeholder="60000" />
            <small style="color: var(--text-secondary); font-size: 9.5px; display: block; margin-top: 3px;">* ค่าลดหย่อนพื้นฐานสำหรับผู้เสียภาษีทุกคน (ปกติ 60,000 บาท)</small>
          </div>
          
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${lang === "en" ? "Social Security (Max 9,000)" : "ประกันสังคม (สูงสุด 9,000)"}</label>
            <input type="number" id="tax-ssf" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${ssf}" placeholder="9000" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${lang === "en" ? "Provident Fund / Pension" : "กองทุนสำรองเลี้ยงชีพ / กบข. / บำนาญ"}</label>
            <input type="number" id="tax-pvd" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${pvd}" placeholder="0" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${lang === "en" ? "Mutual Funds (SSF / RMF / ThaiESG)" : "กองทุนลดหย่อนภาษี (SSF / RMF / ThaiESG)"}</label>
            <input type="number" id="tax-mf" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${mf}" placeholder="0" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">${lang === "en" ? "Other Deductions (e.g. Life Insurance, Parents)" : "ค่าลดหย่อนอื่น ๆ (เช่น เบี้ยประกันชีวิต, บิดามารดา)"}</label>
            <input type="number" id="tax-other" class="form-control tax-calc-input" style="font-size:12px; padding:8px 12px;" value="${other}" placeholder="0" />
          </div>
        </div>

        <div style="background: rgba(255, 184, 0, 0.05); padding: 12px 14px; border-radius: 12px; border: 1.5px dashed rgba(255, 184, 0, 0.25); margin-top: 16px; display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 12px; color: var(--gold);">${lang === "en" ? "Total Deductions:" : "รวมลดหย่อนภาษีทั้งหมด:"}</strong>
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
