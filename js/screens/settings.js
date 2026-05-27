import { store } from '../store.js';
import { currencies } from '../currency.js';
import { t } from '../i18n.js';

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

    <!-- Premium Card Display -->
    <div class="card premium-card-banner" style="margin-bottom: 24px; position: relative; overflow: hidden; background: linear-gradient(135deg, #FFB800 0%, #FF8F00 100%); color: #161B22; border: none; padding: 20px; border-radius: 18px; display: flex; flex-direction: column; gap: 8px;">
      <!-- Glowing decoration -->
      <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; border-radius: 50%; background: rgba(255, 255, 255, 0.15); filter: blur(20px);"></div>
      
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L2 22h20L12 2zm0 4.8L18.4 18H5.6L12 6.8z"/></svg>
        <span style="font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 1px;">FinTrack Pro Member</span>
      </div>
      <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: #161B22;">เปิดใช้งานฟีเจอร์พรีเมียมแล้ว</h3>
      <p style="margin: 0; font-size: 12px; opacity: 0.9; line-height: 1.4;">คุณสามารถใช้งานตัววางแผนการเงินแบบออฟไลน์, รายการประจำไม่จำกัด, เปลี่ยนสกุลเงินทั่วโลก และระบบแจ้งเตือนภายในแอปได้ทั้งหมด</p>
    </div>

    <!-- Settings Group -->
    <div class="card" style="margin-bottom: 16px; padding: 12px;">
      <h3 class="card-title" style="margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">ความต้องการทั่วไป</h3>
      
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

      <!-- Currency Select Option -->
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
    </div>

    <!-- Developer/Notifications settings -->
    <div class="card" style="margin-bottom: 24px; padding: 12px;">
      <h3 class="card-title" style="margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">ระบบแจ้งเตือน (System Notification)</h3>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button id="test-notify-btn" class="btn" style="background: rgba(255, 184, 0, 0.1); color: var(--gold); border: 1px solid rgba(255, 184, 0, 0.2); padding: 10px; font-size: 13px; font-weight: 600;">
          ทดสอบส่งการแจ้งเตือนจำลอง (Test Notification)
        </button>
        <button id="clear-notify-btn" class="btn" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 10px; font-size: 13px;">
          ล้างการอนุญาตและประวัติทั้งหมด
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
      <div>Version 2.0.0 )</div>
    </div>

    <div style="height: 100px;"></div>
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
      alert(installbtn)
      alert('ให้กดปุ่ม "แชร์" ใน Browser ของคุณ จากนั้นให้คลิกที่ "เพิ่มลงในหน้าจอโฮม"');
    }
  });

  container.querySelector('#test-notify-btn').addEventListener('click', () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        store.triggerNotification(
          'แจ้งเตือน FinTrack',
          'ระบบการแจ้งเตือนทำงานได้ปกติ! คุณจะได้รับการแจ้งเตือนบันทึกและรายการประจำที่นี่ 🔔'
        );
      } else {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            store.triggerNotification('ยินดีต้อนรับ!', 'คุณได้เปิดใช้งานระบบแจ้งเตือนของ FinTrack แล้ว');
          } else {
            alert('คุณไม่ได้อนุญาตให้เว็บส่งการแจ้งเตือน กรุณาเปลี่ยนการตั้งค่าเบราว์เซอร์ของคุณ');
          }
        });
      }
    } else {
      alert('เบราว์เซอร์นี้ไม่สนับสนุนการแจ้งเตือนภายในแอป');
    }
  });

  // Reset localstorage handler
  container.querySelector('#clear-notify-btn').addEventListener('click', () => {
    if (confirm('คุณต้องการล้างข้อมูลแอปทั้งหมดและเริ่มใหม่ใช่หรือไม่? (การทำธุรกรรมทั้งหมดจะถูกรีเซ็ตกลับเป็นค่าเริ่มต้น)')) {
      localStorage.clear();
      window.location.reload();
    }
  });
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
