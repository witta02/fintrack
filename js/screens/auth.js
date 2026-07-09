import { supabase } from '../supabase.js';
import { store } from '../store.js';
import { router } from '../router.js';
import { t } from '../i18n.js';
import { alerts } from '../utils/alertHelper.js';

let isSignUpMode = false;

export function renderAuth(container) {
  container.innerHTML = `
    <div class="auth-container" style="display: flex; align-items: center; justify-content: center; min-height: 80vh; padding: 20px;">
      <div class="card auth-card" style="width: 100%; max-width: 400px; padding: 32px; border-radius: 20px; box-shadow: var(--shadow);">
        <div class="auth-header" style="text-align: center; margin-bottom: 28px;">
          <h1 class="brand-title shimmer-text" style="font-size: 36px; font-weight: 900; letter-spacing: -1.5px; margin-bottom: 8px;">FinTrack</h1>
          <p class="auth-subtitle" style="font-size: 14px; color: var(--text-secondary); font-weight: 600;">
            ${isSignUpMode ? t('signUp') : t('signIn')}
          </p>
        </div>

        <form id="auth-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block;" for="auth-email">${t('email')}</label>
            <input type="email" id="auth-email" class="form-control" placeholder="email@example.com" required style="width: 100%;" />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block;" for="auth-password">${t('password')}</label>
            <input type="password" id="auth-password" class="form-control" placeholder="••••••••" minlength="6" required style="width: 100%;" />
          </div>

          <button type="submit" id="auth-submit-btn" class="btn-primary" style="width: 100%; margin-top: 12px; padding: 14px; font-weight: 700; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span id="auth-btn-text">${isSignUpMode ? t('signUp') : t('signIn')}</span>
            <div id="auth-spinner" class="spinner hidden"></div>
          </button>
        </form>

        <div style="margin-top: 24px; text-align: center; border-top: 1px solid var(--border); padding-top: 16px;">
          <button id="auth-toggle-mode" style="background: none; border: none; color: var(--gold); font-size: 13px; font-weight: 700; cursor: pointer;">
            ${isSignUpMode ? t('authSwitchToSignIn') : t('authSwitchToSignUp')}
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

  toggleBtn.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    renderAuth(container);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#auth-email').value.trim();
    const password = container.querySelector('#auth-password').value;

    // Show loading state
    submitBtn.disabled = true;
    btnText.textContent = isSignUpMode ? 'กำลังสมัคร...' : 'กำลังเข้าสู่ระบบ...';
    spinner.classList.remove('hidden');

    try {
      if (isSignUpMode) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        // Auto sign-in doesn't always happen if email verification is enabled, 
        // but if it returned a session, sync data immediately.
        if (data.session) {
          btnText.textContent = t('syncingData');
          await store.handleLoginSync(data.user);
          alerts.success(t('signUpSuccess'));
          router.navigate('dashboard');
        } else {
          alerts.success('ลงทะเบียนสำเร็จ', 'กรุณาตรวจสอบกล่องข้อความอีเมลของคุณเพื่อยืนยันบัญชี');
          isSignUpMode = false;
          renderAuth(container);
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        // Fetch / sync data after success
        btnText.textContent = t('syncingData');
        await store.handleLoginSync(data.user);

        alerts.success(t('authSuccess'));
        router.navigate('dashboard');
      }
    } catch (err) {
      console.error(err);
      alerts.error('ล้มเหลว', err.message || t('authError', { error: err.message }));
    } finally {
      // Reset loading state if still on screen
      if (submitBtn) {
        submitBtn.disabled = false;
        btnText.textContent = isSignUpMode ? t('signUp') : t('signIn');
        spinner.classList.add('hidden');
      }
    }
  });
}
