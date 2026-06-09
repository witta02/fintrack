import { store } from '../store.js';
import { currencies } from '../currency.js';
import { t } from '../i18n.js';
import { alerts } from '../utils/alertHelper.js';

export function renderSettings(container) {
  const selectedCurrency = store.getSelectedCurrency();
  const isDarkMode = store.settings.isDarkMode;
  const language = store.settings.language === 'en' ? 'en' : 'th';

  // Build the list of currencies for the select option
  const currencyOptions = Object.values(currencies).map(curr => `
    <option value="${curr.code}" ${selectedCurrency === curr.code ? 'selected' : ''}>
      ${curr.symbol} — ${curr.name} (Rate: ${curr.rate})
    </option>
  `).join('');

  container.innerHTML = `
    <div class="screen-header">
      <h1 class="brand-title">${t('settingsTitle')}</h1>
    </div>

    <!-- Settings Group -->
    <div class="card" style="margin-bottom: 16px; padding: 12px;">
      <h3 class="card-title" style="margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">${t('generalSettings')}</h3>
      
      <!-- Theme Switch Option -->
      <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 6px; border-bottom: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="color: var(--gold); font-size: 18px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t('darkMode')}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${t('swhtodarktxt')}</div>
          </div>
        </div>
        <label class="switch-toggle">
          <input type="checkbox" id="setting-darkmode-chk" ${isDarkMode ? 'checked' : ''} />
          <span class="switch-slider"></span>
        </label>
      </div>

      <div class="setting-item" style="display: flex; flex-direction: column; gap: 8px; padding: 12px 6px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="color: var(--gold); font-size: 18px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t('currency')}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${t('chgcurtxt')}</div>
          </div>
        </div>
        <div class="select-wrapper" style="width: 100%; margin-top: 4px;">
          <select id="setting-currency-select" class="form-control">
            ${currencyOptions}
          </select>
        </div>
      </div>

      <!-- Tax Settings Option -->
      <div class="setting-item" style="display: flex; flex-direction: column; gap: 8px; padding: 12px 6px; border-top: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="color: var(--gold); font-size: 18px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M12 10h3"/></svg>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t('taxSettings')}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${t('taxSettingsDesc')}</div>
          </div>
        </div>
        <button id="setting-tax-btn" class="btn" style="background: rgba(255, 184, 0, 0.1); color: var(--gold); border: 1px solid rgba(255, 184, 0, 0.2); padding: 10px; font-size: 13px; font-weight: 600; width: 100%; margin-top: 4px;">
          ${t('manageTaxDeductions')}
        </button>
      </div>

            <div class="setting-item" style="display: flex; flex-direction: column; gap: 8px; padding: 12px 6px; border-top: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="color: var(--gold); font-size: 18px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t('language')}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${t('languageHint')}</div>
          </div>
        </div>
        <div class="type-switcher" style="margin-bottom: 0;">
          <button type="button" class="type-btn ${language === 'th' ? 'active income-btn' : ''}" id="language-th-btn">${t('thai')}</button>
          <button type="button" class="type-btn ${language === 'en' ? 'active income-btn' : ''}" id="language-en-btn">${t('english')}</button>
        </div>
      </div>

    <!-- Developer/Notifications settings -->
    <div class="card" style="margin-bottom: 24px; padding: 12px;">
      <h3 class="card-title" style="margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">${t('notificationSystem')}</h3>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button id="test-notify-btn" class="btn" style="background: rgba(255, 184, 0, 0.1); color: var(--gold); border: 1px solid rgba(255, 184, 0, 0.2); padding: 10px; font-size: 13px; font-weight: 600;">
        ${t('notitestbtn')}
        </button>
        <button id="clear-notify-btn" class="btn" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 10px; font-size: 13px;">
        ${t('clearbtn')}
        </button>
      </div>
    </div>

    <!-- PWA Installation -->
    <div class="card" style="margin-bottom: 24px; padding: 12px; border: 1px dashed var(--gold);">
      <h3 class="card-title" style="margin-bottom: 16px; font-size: 14px; color: var(--gold); text-transform: uppercase; letter-spacing: 0.5px;">${t('installbtn')}</h3>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">${t('installtxt')}</p>
      <button id="install-app-btn" class="btn-primary" style="padding: 12px; font-size: 14px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        ${t('installbtn')}
      </button>
    </div>

    <!-- App details -->
    <div style="text-align: center; color: var(--text-secondary); font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
      <div>FinTrack</div>
      <div>Version 2.5.5</div>
  `;

  setupEventListeners(container);
}

function setupEventListeners(container) {

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

  const installBtn = container.querySelector('#install-app-btn');
  installBtn.addEventListener('click', () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        window.deferredPrompt = null;
      });
    } else {
      alerts.info(t('installPwaHint'));
    }
  });

  container.querySelector('#test-notify-btn').addEventListener('click', () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        store.triggerNotification(
          t('notiTestTitle'),
          t('notiTestBody')
        );
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

  // Reset localstorage handler
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
        <button class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body" style="padding-top: 10px;">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
          ${t('taxSettingsContext')}
        </p>
        
        <div class="form-group">
          <label class="form-label">${t('annualDeduction')}</label>
          <input type="number" id="tax-deduction-input" class="form-control" value="${store.settings.taxDeduction || 60000}" placeholder="e.g. 60000" />
          <small style="display: block; margin-top: 6px; color: var(--text-secondary); font-size: 11px;">
            ${t('personalDeductionHint')}
          </small>
        </div>

        <div style="background: var(--surface); padding: 14px; border-radius: 14px; border: 1px solid var(--border); margin-top: 10px;">
          <h4 style="font-size: 12px; font-weight: 700; margin-bottom: 8px; color: var(--gold);">${t('taxKnowledge')}</h4>
          <ul style="font-size: 11px; color: var(--text-secondary); padding-left: 16px; line-height: 1.6;">
            <li>${t('taxStep1')}</li>
            <li>${t('taxStep2')}</li>
            <li>${t('taxStep3')}</li>
          </ul>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 24px;">
        <button class="btn modal-cancel-btn" style="flex: 1; border: 1px solid var(--border); padding: 12px; border-radius: 12px;">${t('cancel')}</button>
        <button class="btn-primary modal-save-btn" style="flex: 1; padding: 12px; border-radius: 12px;">${t('save')}</button>
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
