import { supabase } from '../supabase.js';
import { store } from '../store.js';
import { router } from '../router.js';
import { t } from '../i18n.js';
import { alerts } from '../utils/alertHelper.js';

let isSignUpMode = false;

export function renderAuth(container) {
  container.innerHTML = `
    <div class="auth-page-wrapper">
      <div class="auth-card-wrapper">
        <!-- Logo -->
        <div class="auth-logo-section">
          <div class="auth-logo-icon">
            <img src="/icons/icon-192.png" alt="FinTrack" style="width:44px;height:44px;border-radius:14px;" onerror="this.style.display='none';this.parentElement.innerHTML='<svg width=32 height=32 viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2.5&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><path d=&quot;M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z&quot;/></svg>'" />
          </div>
          <div class="auth-brand-name">FinTrack</div>
          <div class="auth-brand-tagline">จัดการเงินอย่างมีสไตล์ · Track Money in Style</div>
        </div>

        <!-- Form Card -->
        <div class="auth-form-card">
          <div class="auth-mode-title">${isSignUpMode ? t('signUp') : t('signIn')}</div>
          <div class="auth-mode-subtitle">
            ${isSignUpMode
              ? 'สร้างบัญชีเพื่อบันทึกข้อมูลบน Cloud และใช้งานในทุกอุปกรณ์'
              : 'ยินดีต้อนรับกลับ — ข้อมูลของคุณรออยู่ในคลาวด์'}
          </div>

          <form id="auth-form">
            <div class="auth-input-group">
              <label class="auth-input-label" for="auth-email">${t('email')}</label>
              <input type="email" id="auth-email" class="auth-input" placeholder="email@example.com" required autocomplete="email" />
            </div>

            <div class="auth-input-group">
              <label class="auth-input-label" for="auth-password">${t('password')}</label>
              <input type="password" id="auth-password" class="auth-input" placeholder="••••••••" minlength="6" required autocomplete="${isSignUpMode ? 'new-password' : 'current-password'}" />
            </div>

            <button type="submit" id="auth-submit-btn" class="auth-submit-btn">
              <span id="auth-btn-text">${isSignUpMode ? t('signUp') : t('signIn')}</span>
              <div id="auth-spinner" class="spinner hidden"></div>
            </button>
          </form>

          <div class="auth-divider"><span>หรือ</span></div>

          <button id="auth-toggle-mode" class="auth-toggle-btn">
            ${isSignUpMode ? t('authSwitchToSignIn') : t('authSwitchToSignUp')}
          </button>
        </div>

        <!-- Back link -->
        <div style="text-align: center; margin-top: 20px;">
          <button id="auth-back-btn" style="background: none; border: none; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: color var(--transition); display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            กลับไปหน้าแรก
          </button>
        </div>
      </div>
    </div>
  `;

  setupEventListeners(container);
}

function setupEventListeners(container) {
  const form = container.querySelector('#auth-form');
  const toggleBtn = container.querySelector('#auth-toggle-mode');
  const submitBtn = container.querySelector('#auth-submit-btn');
  const btnText = container.querySelector('#auth-btn-text');
  const spinner = container.querySelector('#auth-spinner');
  const backBtn = container.querySelector('#auth-back-btn');

  backBtn.addEventListener('click', () => {
    router.navigate('dashboard');
  });

  toggleBtn.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    renderAuth(container);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#auth-email').value.trim();
    const password = container.querySelector('#auth-password').value;

    submitBtn.disabled = true;
    btnText.textContent = isSignUpMode ? 'กำลังสมัคร...' : 'กำลังเข้าสู่ระบบ...';
    spinner.classList.remove('hidden');

    try {
      if (isSignUpMode) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          btnText.textContent = t('syncingData');
          await store.handleLoginSync(data.user);
          alerts.success(t('signUpSuccess'));
          router.navigate('dashboard');
        } else {
          alerts.success('ลงทะเบียนสำเร็จ', 'กรุณาตรวจสอบกล่องอีเมลของคุณเพื่อยืนยันบัญชี');
          isSignUpMode = false;
          renderAuth(container);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        btnText.textContent = t('syncingData');
        await store.handleLoginSync(data.user);
        alerts.success(t('authSuccess'));
        router.navigate('dashboard');
      }
    } catch (err) {
      console.error(err);
      alerts.error('ล้มเหลว', err.message || t('authError', { error: err.message }));
      submitBtn.disabled = false;
      btnText.textContent = isSignUpMode ? t('signUp') : t('signIn');
      spinner.classList.add('hidden');
    }
  });
}
