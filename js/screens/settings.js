import { store } from '../store.js';
import { currencies } from '../currency.js';
import { t } from '../i18n.js';
import { alerts } from '../utils/alertHelper.js';
import { exportData, importData, exportToText, importFromText } from '../utils/dataTransfer.js';
import { syncHelper } from '../utils/syncHelper.js';

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
    <div class="screen-header">
      <div>
        <div class="section-eyebrow">${t('settingsTitle')}</div>
        <h1 class="brand-title" style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${t('settingsTitle')}</h1>
      </div>
      <span class="premium-badge">v2.5.5</span>
    </div>

    <!-- ── General ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px;">${t('generalSettings')}</div>
    <div class="card" style="padding: 8px 14px; margin-bottom: 20px;">

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
           <button type="button" id="language-th-btn" style="padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1.5px solid ${language === 'th' ? 'var(--gold)' : 'var(--border)'}; background: ${language === 'th' ? 'rgba(245,200,66,0.12)' : 'var(--surface)'}; color: ${language === 'th' ? 'var(--gold)' : 'var(--text-secondary)'}; transition: all var(--transition);">🇹🇭 TH</button>
           <button type="button" id="language-en-btn" style="padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1.5px solid ${language === 'en' ? 'var(--gold)' : 'var(--border)'}; background: ${language === 'en' ? 'rgba(245,200,66,0.12)' : 'var(--surface)'}; color: ${language === 'en' ? 'var(--gold)' : 'var(--text-secondary)'}; transition: all var(--transition);">🇬🇧 EN</button>
         </div>`
      )}
    </div>

    <!-- ── Currency ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px;">${t('currency')}</div>
    <div class="card" style="padding: 14px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div class="setting-icon-badge" style="background: rgba(52,211,153,0.15);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--income);"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t('currency')}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${t('chgcurtxt')}</div>
        </div>
      </div>
      <select id="setting-currency-select" class="form-control" style="font-size: 14px;">
        ${currencyOptions}
      </select>
    </div>

    <!-- ── Tax ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px;">${t('taxSettings')}</div>
    <div class="card" style="padding: 14px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
        <div class="setting-icon-badge" style="background: rgba(248,113,113,0.15);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--expense);"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M12 10h3"/></svg>
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t('taxSettings')}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${t('taxSettingsDesc')}</div>
        </div>
      </div>
      <button id="setting-tax-btn" style="
        width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
        background: rgba(245,200,66,0.08); color: var(--gold);
        border: 1px solid rgba(245,200,66,0.22); padding: 11px;
        border-radius: 12px; font-size: 13px; font-weight: 700;
        transition: all var(--transition);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        ${t('manageTaxDeductions')}
      </button>
    </div>

    <!-- ── Data Transfer ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px;">${t('dataTransferTitle')}</div>
    <div class="card" style="
      padding: 18px 16px;
      margin-bottom: 20px;
      border-color: rgba(124,92,252,0.25);
      background: linear-gradient(135deg, rgba(124,92,252,0.06), var(--card));
    ">
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 18px; line-height: 1.65;">${t('dataTransferDesc')}</p>
      
      <!-- Option 1: Quick Code -->
      <div style="margin-bottom: 18px;">
        <h4 style="font-size: 13px; font-weight: 700; color: var(--gold); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          ${t('easyTransferTitle')}
        </h4>
        <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5;">${t('easyTransferDesc')}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button id="data-export-code-btn" style="
            display: flex; align-items: center; justify-content: center; gap: 8px;
            background: rgba(245,200,66,0.08); border: 1.5px solid rgba(245,200,66,0.22);
            color: var(--text-primary); padding: 12px 10px; border-radius: 12px;
            font-weight: 700; font-size: 12px; cursor: pointer; transition: all var(--transition);">
            ${t('copyCodeBtn')}
          </button>
          <button id="data-import-code-btn" style="
            display: flex; align-items: center; justify-content: center; gap: 8px;
            background: rgba(124,92,252,0.08); border: 1.5px solid rgba(124,92,252,0.22);
            color: var(--text-primary); padding: 12px 10px; border-radius: 12px;
            font-weight: 700; font-size: 12px; cursor: pointer; transition: all var(--transition);">
            ${t('pasteCodeBtn')}
          </button>
        </div>
      </div>

      <div style="height: 1px; background: var(--border); margin: 18px 0;"></div>

      <!-- Option 2: Backup File -->
      <div>
        <h4 style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
          ${t('fileTransferTitle')}
        </h4>
        <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5;">${t('fileTransferDesc')}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button id="data-export-btn" style="
            display: flex; align-items: center; justify-content: center; gap: 8px;
            background: rgba(255,255,255,0.04); border: 1.5px solid var(--border);
            color: var(--text-secondary); padding: 12px 10px; border-radius: 12px;
            font-weight: 600; font-size: 11px; cursor: pointer; transition: all var(--transition);">
            ${t('exportBtn')}
          </button>
          <button id="data-import-btn" style="
            display: flex; align-items: center; justify-content: center; gap: 8px;
            background: rgba(255,255,255,0.04); border: 1.5px solid var(--border);
            color: var(--text-secondary); padding: 12px 10px; border-radius: 12px;
            font-weight: 600; font-size: 11px; cursor: pointer; transition: all var(--transition);">
            ${t('importBtn')}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Real-Time Sync ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px; display: none;">${t('syncSectionTitle')}</div>
    <div class="card" style="
      display: none;
      padding: 18px 16px;
      margin-bottom: 20px;
      border-color: rgba(52,211,153,0.25);
      background: linear-gradient(135deg, rgba(52,211,153,0.06), var(--card));
    ">
      <p id="sync-status-desc" style="font-size: 12px; color: var(--text-secondary); margin-bottom: 18px; line-height: 1.65;">
        ${t('syncSectionDesc')}
      </p>

      <div id="sync-setup-area" style="display: flex; flex-direction: column; gap: 12px;">
        <button id="sync-host-btn" class="btn-primary" style="
          background: linear-gradient(135deg, #10b981, #059669); color: #fff;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); border: none; padding: 12px;
          border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all var(--transition);">
          📡 ${t('syncHostBtn')}
        </button>
        
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
          <input type="text" id="sync-code-input" placeholder="${t('syncInputPlaceholder')}" style="
            flex: 1; height: 42px; text-align: center; font-size: 14px; font-weight: 700;
            letter-spacing: 2px; border-radius: 10px; border: 1.5px solid var(--border);" maxLength="5" />
          <button id="sync-join-btn" style="
            height: 42px; padding: 0 16px; border-radius: 10px;
            background: rgba(245,200,66,0.08); border: 1.5px solid rgba(245,200,66,0.22);
            color: var(--gold); font-weight: 700; font-size: 13px; cursor: pointer; transition: all var(--transition);">
            🔌 ${t('syncJoinBtn')}
          </button>
        </div>
      </div>

      <!-- Active Connection Status UI (hidden by default) -->
      <div id="sync-active-area" class="hidden" style="
        display: flex; flex-direction: column; gap: 10px; align-items: center; text-align: center; padding: 8px 0;">
        <div style="display: flex; align-items: center; gap: 8px; color: var(--income); font-weight: 700; font-size: 14px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--income); display: inline-block; animation: typingBounce 1s infinite alternate;"></span>
          ${t('syncConnectedStatus')}
        </div>
        <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
          ${t('syncConnectedDesc')}
        </p>
        <button id="sync-disconnect-btn" style="
          padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 700;
          background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.22);
          color: var(--expense); cursor: pointer; transition: all var(--transition);">
          ❌ ${t('syncDisconnectBtn')}
        </button>
      </div>
    </div>

    <!-- ── Notifications ───────────────────────────────── -->
    <div class="section-eyebrow" style="margin-bottom: 8px; padding: 0 4px;">${t('notificationSystem')}</div>
    <div class="card" style="padding: 14px; margin-bottom: 20px;">
      <div style="display: flex; gap: 10px;">
        <button id="test-notify-btn" style="
          flex: 1; background: rgba(245,200,66,0.08); color: var(--gold);
          border: 1px solid rgba(245,200,66,0.22); padding: 11px;
          border-radius: 12px; font-size: 13px; font-weight: 700; transition: all var(--transition);">
          🔔 ${t('notitestbtn')}
        </button>
        <button id="clear-notify-btn" style="
          flex: 1; background: rgba(248,113,113,0.07); color: var(--expense);
          border: 1px solid rgba(248,113,113,0.22); padding: 11px;
          border-radius: 12px; font-size: 13px; font-weight: 700; transition: all var(--transition);">
          🗑 ${t('clearbtn')}
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
        <div class="setting-icon-badge" style="background: rgba(245,200,66,0.15); font-size: 20px;">📲</div>
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
      <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 0.5px;">Version 2.5.5 · Premium Edition</div>
    </div>
  `;

  setupEventListeners(container);
}

function setupEventListeners(container) {
  // Sync Helper Status Callback
  const handleSyncStatus = (status, code) => {
    const setupArea = container.querySelector('#sync-setup-area');
    const activeArea = container.querySelector('#sync-active-area');
    const statusDesc = container.querySelector('#sync-status-desc');
    const hostBtn = container.querySelector('#sync-host-btn');
    const codeInput = container.querySelector('#sync-code-input');
    const joinBtn = container.querySelector('#sync-join-btn');

    if (!setupArea || !activeArea) return;

    if (status === 'hosting') {
      setupArea.classList.remove('hidden');
      activeArea.classList.add('hidden');
      statusDesc.innerHTML = `<span style="color: var(--gold); font-weight: 700; font-size: 15px; display: block; margin-bottom: 8px;">📡 รหัสเชื่อมต่อ: <span style="font-size: 20px; font-family: monospace; letter-spacing: 2px;">${code}</span></span> นำรหัสนี้ไปป้อนในปุ่มเชื่อมต่อของอีกเครื่องเพื่อเริ่มการซิงค์`;
      hostBtn.textContent = '🛑 ' + (store.settings.language === 'en' ? 'Cancel Hosting' : 'ยกเลิกการเปิดห้อง');
      hostBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      hostBtn.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.3)';
      hostBtn.disabled = false;
      codeInput.disabled = true;
      joinBtn.disabled = true;
    } else if (status === 'connecting') {
      setupArea.classList.remove('hidden');
      activeArea.classList.add('hidden');
      statusDesc.textContent = store.settings.language === 'en' ? 'Connecting to device...' : 'กำลังเชื่อมต่อไปยังอุปกรณ์...';
      hostBtn.disabled = true;
      codeInput.disabled = true;
      joinBtn.disabled = true;
    } else if (status === 'connected') {
      setupArea.classList.add('hidden');
      activeArea.classList.remove('hidden');
      statusDesc.textContent = store.settings.language === 'en' 
        ? 'Real-time database sync is active. Any changes will instantly replicate across devices.' 
        : 'ระบบซิงค์แบบเรียลไทม์กำลังทำงาน ทุกการเปลี่ยนแปลงจะอัปเดตไปอีกเครื่องทันที';
    } else { // idle
      setupArea.classList.remove('hidden');
      activeArea.classList.add('hidden');
      statusDesc.textContent = t('syncSectionDesc');
      
      hostBtn.disabled = false;
      hostBtn.textContent = '📡 ' + t('syncHostBtn');
      hostBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      hostBtn.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
      
      codeInput.disabled = false;
      codeInput.value = '';
      joinBtn.disabled = false;
    }
  };

  syncHelper.init(handleSyncStatus);

  // Initialize UI based on current sync status
  if (syncHelper.isConnected()) {
    handleSyncStatus('connected');
  } else if (syncHelper.getSyncCode()) {
    handleSyncStatus('hosting', syncHelper.getSyncCode());
  } else {
    handleSyncStatus('idle');
  }

  // Click listeners for Sync
  const hostBtn = container.querySelector('#sync-host-btn');
  const joinBtn = container.querySelector('#sync-join-btn');
  const disconnectBtn = container.querySelector('#sync-disconnect-btn');
  const codeInput = container.querySelector('#sync-code-input');

  hostBtn.addEventListener('click', () => {
    if (hostBtn.textContent.includes('Cancel') || hostBtn.textContent.includes('ยกเลิก')) {
      syncHelper.disconnect(true);
    } else {
      syncHelper.hostSession(null, true);
    }
  });

  joinBtn.addEventListener('click', () => {
    const code = codeInput.value.trim();
    if (code.length !== 5 || isNaN(code)) {
      alerts.warning(
        store.settings.language === 'en' ? 'Invalid Code' : 'รหัสไม่ถูกต้อง',
        store.settings.language === 'en' ? 'Please enter a 5-digit connection code.' : 'กรุณากรอกรหัสเชื่อมต่อ 5 หลักที่เป็นตัวเลข'
      );
      return;
    }
    syncHelper.connectToSession(code, true);
  });

  disconnectBtn.addEventListener('click', () => {
    syncHelper.disconnect(true);
  });

  container.querySelector('#data-export-btn').addEventListener('click', () => exportData());
  container.querySelector('#data-import-btn').addEventListener('click', () => importData());
  container.querySelector('#data-export-code-btn').addEventListener('click', () => exportToText());
  container.querySelector('#data-import-code-btn').addEventListener('click', () => importFromText());

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

  container.querySelector('#setting-tax-btn').addEventListener('click', () => {
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
