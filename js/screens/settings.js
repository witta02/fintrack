import { store } from '../store.js';
import { currencies } from '../currency.js';
import { t } from '../i18n.js';
import { alerts } from '../utils/alertHelper.js';
import { exportToCloud, importFromCloud } from '../utils/dataTransfer.js';

// Reusable setting row helper
function settingRow(iconSvg, iconBg, title, subtitle, rightSlot, extras = '') {
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
  const language = store.settings.language === 'en' ? 'en' : 'th';

  const currencyOptions = Object.values(currencies).map(curr => `
    <option value="${curr.code}" ${selectedCurrency === curr.code ? 'selected' : ''}>
      ${curr.symbol} — ${curr.name}
    </option>
  `).join('');

  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 22px;">
      <h1 class="brand-title" style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px;">${t('settingsTitle')}</h1>
      <span class="premium-badge">v2.5.5</span>
    </div>

    <!-- ── General ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t('generalSettings')}</div>
    <div class="card general-settings-card" style="padding: 8px 14px; margin-bottom: 20px;">

      <!-- Dark Mode -->
      ${settingRow(
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>`,
        'rgba(245,200,66,0.15)',
        t('darkMode'),
        t('swhtodarktxt'),
        `<label class="switch-toggle">
           <input type="checkbox" id="setting-darkmode-chk" ${isDarkMode ? 'checked' : ''} />
           <span class="switch-slider"></span>
         </label>`
      )}

      <div style="height: 1px; background: var(--border); margin: 4px 0;"></div>

      <!-- Language -->
      ${settingRow(
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`,
        'rgba(124,92,252,0.15)',
        t('language'),
        t('languageHint'),
        `<div style="display: flex; gap: 6px;">
           <button type="button" id="language-th-btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1.5px solid ${language === 'th' ? 'var(--gold)' : 'var(--border)'}; background: ${language === 'th' ? 'rgba(245,200,66,0.12)' : 'var(--surface)'}; color: ${language === 'th' ? 'var(--gold)' : 'var(--text-secondary)'}; transition: all var(--transition);">
             <svg width="16" height="12" viewBox="0 0 9 6" style="border-radius: 2px;">
               <rect width="9" height="6" fill="#A51931"/>
               <rect y="1" width="9" height="4" fill="#F4F5F8"/>
               <rect y="2" width="9" height="2" fill="#2D2A4A"/>
             </svg>
             TH
           </button>
           <button type="button" id="language-en-btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1.5px solid ${language === 'en' ? 'var(--gold)' : 'var(--border)'}; background: ${language === 'en' ? 'rgba(245,200,66,0.12)' : 'var(--surface)'}; color: ${language === 'en' ? 'var(--gold)' : 'var(--text-secondary)'}; transition: all var(--transition);">
             <svg width="16" height="12" viewBox="0 0 50 30" style="border-radius: 2px;">
               <rect width="50" height="30" fill="#012169"/>
               <path d="M0 0 L50 30 M50 0 L0 30" stroke="#FFF" stroke-width="6"/>
               <path d="M0 0 L50 30 M50 0 L0 30" stroke="#C8102E" stroke-width="4"/>
               <path d="M25 0 V30 M0 15 H50" stroke="#FFF" stroke-width="10"/>
               <path d="M25 0 V30 M0 15 H50" stroke="#C8102E" stroke-width="6"/>
             </svg>
             EN
           </button>
         </div>`
      )}
    </div>

    <!-- ── Currency & Tax Section (Responsive Grid) ── -->
    <div class="section-eyebrow desktop-only" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">สกุลเงินและภาษี</div>
    <div class="currency-tax-grid">
      <div class="currency-col">
        <div class="section-eyebrow mobile-only" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t('currency')}</div>
        <div class="card" style="padding: 14px; margin-bottom: 20px; height: calc(100% - 28px); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div class="setting-icon-badge" style="background: rgba(52,211,153,0.15);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--income);"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t('currency')}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">${t('chgcurtxt')}</div>
            </div>
          </div>
          <select id="setting-currency-select" class="form-control" style="font-size: 14px; margin-top: auto;">
            ${currencyOptions}
          </select>
        </div>
      </div>

      <div class="tax-col">
        <div class="section-eyebrow mobile-only" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t('taxSettings')}</div>
        <div class="card" style="padding: 8px 14px; margin-bottom: 20px; height: calc(100% - 28px); display: flex; align-items: center;">
          <div id="tax-row-wrapper" style="cursor: pointer; width: 100%;">
            ${settingRow(
              `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--expense);"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M12 10h3"/></svg>`,
              'rgba(248,113,113,0.15)',
              t('taxSettings'),
              t('taxSettingsDesc'),
              `<button id="setting-tax-btn" style="
                display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
                background: rgba(245,200,66,0.08); color: var(--gold);
                border: 1px solid rgba(245,200,66,0.22);
                border-radius: 8px; cursor: pointer;
                transition: all var(--transition);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>`
            )}
          </div>
        </div>
      </div>
    </div>

    <!-- ── Data Transfer ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t('dataTransferTitle')}</div>
    <div class="card" style="padding: 14px; margin-bottom: 20px;">
      ${settingRow(
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #34d399;"><path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.89-1.78-3.5-3.5-3.5a5.5 5.5 0 0 0-5.5 5.5c0 .34.02.68.06 1A4.5 4.5 0 0 0 7.5 19Z"/></svg>`,
        'rgba(16,185,129,0.15)',
        t('dataTransferTitle'),
        t('dataTransferDesc'),
        '',
        `
        <div style="margin-top: 6px;">
          <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5;">${t('cloudSyncSectionDesc')}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button id="data-export-cloud-btn" class="btn-primary" style="
              display: flex; align-items: center; justify-content: center; gap: 6px;
              background: linear-gradient(135deg, #10b981, #059669); color: #fff;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); border: none;
              padding: 11px 10px; border-radius: 12px;
              font-weight: 700; font-size: 12px; cursor: pointer; transition: all var(--transition);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              ${t('exportCloudBtn')}
            </button>
            <button id="data-import-cloud-btn" style="
              display: flex; align-items: center; justify-content: center; gap: 6px;
              background: rgba(16,185,129,0.08); border: 1.5px solid rgba(16,185,129,0.22);
              color: #34d399; padding: 11px 10px; border-radius: 12px;
              font-weight: 700; font-size: 12px; cursor: pointer; transition: all var(--transition);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ${t('importCloudBtn')}
            </button>
          </div>
        </div>
        `
      )}
    </div>

    <!-- ── Notifications ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px; text-align: center;">${t('notificationSystem')}</div>
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
          ${t('notitestbtn')}
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
          ${t('clearbtn')}
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
          <div style="font-size: 14px; font-weight: 700; color: var(--gold);">${t('installbtn')}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px; line-height: 1.5;">${t('installtxt')}</div>
        </div>
      </div>
      <button id="install-app-btn" class="btn-primary" style="padding: 12px; font-size: 13px; border-radius: 12px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        ${t('installbtn')}
      </button>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 8px 0 4px; display: flex; flex-direction: column; gap: 4px;">
      <div style="font-family: var(--font-heading); font-weight: 800; font-size: 14px; background: linear-gradient(135deg, var(--gold-light), var(--amber)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">FinTrack</div>
      <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 0.5px;">Version 2.5.5</div>
    </div>
  `;

  setupEventListeners(container);
}

function setupEventListeners(container) {
  container.querySelector('#data-export-cloud-btn').addEventListener('click', () => exportToCloud());
  container.querySelector('#data-import-cloud-btn').addEventListener('click', () => importFromCloud());

  container.querySelector('#setting-darkmode-chk').addEventListener('change', () => {
    store.toggleTheme();
  });

  container.querySelector('#setting-currency-select').addEventListener('change', (e) => {
    store.setCurrency(e.target.value);
  });

  container.querySelector('#language-th-btn').addEventListener('click', () => {
    store.setLanguage('th');
    updateNavLabels();
    renderSettings(container);
  });

  container.querySelector('#language-en-btn').addEventListener('click', () => {
    store.setLanguage('en');
    updateNavLabels();
    renderSettings(container);
  });

  container.querySelector('#install-app-btn').addEventListener('click', () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => {
        window.deferredPrompt = null;
      });
    } else {
      alerts.info(t('installPwaHint'));
    }
  });

  container.querySelector('#test-notify-btn').addEventListener('click', () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        store.triggerNotification(t('notiTestTitle'), t('notiTestBody'));
      } else {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            store.triggerNotification(t('notiWelcomeTitle'), t('notiWelcomeBody'));
          } else {
            alerts.warning(t('notiDenied'));
          }
        });
      }
    } else {
      alerts.error(t('notiUnsupported'));
    }
  });

  container.querySelector('#tax-row-wrapper').addEventListener('click', () => {
    showTaxSettings(container);
  });

  container.querySelector('#clear-notify-btn').addEventListener('click', async () => {
    const isConfirmed = await alerts.confirmReset(
      store.settings.language === 'en' ? 'Reset App Data?' : 'ยืนยันการรีเซ็ตข้อมูล?',
      t('resetAppConfirm')
    );
    if (isConfirmed) {
      localStorage.clear();
      window.location.reload();
    }
  });
}

function showTaxSettings(container) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">${t('taxSettingsTitle')}</h3>
        <button class="modal-close-btn">×</button>
      </div>
      <div style="padding-top: 6px;">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.6;">
          ${t('taxSettingsContext')}
        </p>
        <div class="form-group">
          <label class="form-label">${t('annualDeduction')}</label>
          <input type="number" id="tax-deduction-input" class="form-control" value="${store.settings.taxDeduction || 60000}" placeholder="e.g. 60000" />
          <small style="display: block; margin-top: 6px; color: var(--text-secondary); font-size: 11px;">${t('personalDeductionHint')}</small>
        </div>
        <div style="background: var(--surface); padding: 14px; border-radius: 14px; border: 1px solid var(--border); margin-top: 6px;">
          <h4 style="font-size: 12px; font-weight: 700; margin-bottom: 8px; color: var(--gold);">${t('taxKnowledge')}</h4>
          <ul style="font-size: 11px; color: var(--text-secondary); padding-left: 16px; line-height: 1.7;">
            <li>${t('taxStep1')}</li>
            <li>${t('taxStep2')}</li>
            <li>${t('taxStep3')}</li>
          </ul>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 24px;">
        <button class="modal-cancel-btn" style="flex:1; border:1px solid var(--border); padding:12px; border-radius:12px; color: var(--text-secondary); font-weight: 600;">${t('cancel')}</button>
        <button class="btn-primary modal-save-btn" style="flex:1; padding:12px; border-radius:12px;">${t('save')}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => document.body.removeChild(modal);
  modal.querySelector('.modal-close-btn').onclick = close;
  modal.querySelector('.modal-cancel-btn').onclick = close;
  modal.querySelector('.modal-save-btn').onclick = () => {
    const val = modal.querySelector('#tax-deduction-input').value;
    store.updateTaxDeduction(val);
    close();
    alerts.success(t('taxSaveSuccess'));
  };
}

function updateNavLabels() {
  const labels = {
    dashboard: t('navDashboard'),
    transactions: t('navTransactions'),
    addTransaction: t('navAdd'),
    planner: 'Planner',
    recurring: t('navRecurring'),
    settings: t('navSettings')
  };
  document.querySelectorAll('[data-screen]').forEach(btn => {
    const screen = btn.getAttribute('data-screen');
    const label = btn.querySelector('span');
    if (label && labels[screen]) label.textContent = labels[screen];
  });
}
