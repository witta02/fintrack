import { supabase } from "../supabase.js";
import { store } from "../store.js";
import { router } from "../router.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";

let authMode = "signin"; // "signin" | "signup"

export function renderAuth(container, params) {
  if (params?.mode) {
    authMode = params.mode;
  }
  const isEn = store.settings.language === "en";

  container.innerHTML = `
    <style>
      .auth-tab-pill {
        flex: 1;
        padding: 10px;
        text-align: center;
        font-size: 13px;
        font-weight: 800;
        border-radius: var(--radius);
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        background: transparent;
        color: var(--text-secondary);
      }
      .auth-tab-pill.active {
        background: var(--gold);
        color: #000;
        box-shadow: var(--btn-shadow);
      }
    </style>

    <div class="auth-page-wrapper" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px 16px;">
      <div class="auth-card-wrapper" style="width: 100%; max-width: 400px;">
        <!-- Logo -->
        <div class="auth-logo-section" style="margin-bottom: 24px; text-align: center;">
          <div class="auth-logo-icon" style="width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 12px auto; overflow: hidden; box-shadow: 0 12px 30px rgba(245, 200, 66, 0.25); background: var(--gold-soft); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; color: var(--gold); border: 2px solid var(--gold);">
            FT
          </div>
          <div class="auth-brand-name" style="font-size: 24px; font-weight: 900; color: var(--text-primary); letter-spacing: -0.5px;">
            FinTrack <span style="color: var(--gold); font-size: 14px; font-weight: 800; background: var(--gold-soft); padding: 2px 6px; border-radius: 6px;">v3.0</span>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
            ${isEn ? 'Personal Finance & Cloud Sync' : 'ระบบบันทึกการเงินและซิงค์ข้อมูล Cloud'}
          </div>
        </div>

        <!-- Form Card -->
        <div class="auth-form-card" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px 20px; box-shadow: var(--card-shadow);">
          <!-- Sign In / Sign Up Mode Switcher Tabs -->
          <div style="display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); padding: 4px; border-radius: var(--radius-lg); margin-bottom: 20px;">
            <button type="button" id="tab-signin" class="auth-tab-pill ${authMode === 'signin' ? 'active' : ''}">
              ${isEn ? 'Sign In' : 'เข้าสู่ระบบ'}
            </button>
            <button type="button" id="tab-signup" class="auth-tab-pill ${authMode === 'signup' ? 'active' : ''}">
              ${isEn ? 'Create Account' : 'สมัครสมาชิก'}
            </button>
          </div>

          <div id="auth-header-desc" style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; font-weight: 600;">
            ${authMode === 'signin' 
              ? (isEn ? 'Welcome back! Enter your credentials to sync.' : 'ยินดีต้อนรับกลับ! เข้าสู่ระบบเพื่อซิงค์ข้อมูล')
              : (isEn ? 'Create a free account to back up and sync across devices.' : 'สร้างบัญชีฟรีเพื่อสำรองข้อมูลและใช้งานได้ทุกอุปกรณ์')}
          </div>

          <form id="auth-form">
            <div class="auth-input-group" style="margin-bottom: 14px;">
              <label class="auth-input-label" for="auth-email" style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${t("email")}</label>
              <input type="email" id="auth-email" class="auth-input" placeholder="email@example.com" required autocomplete="email" style="width: 100%; padding: 11px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 600;" />
            </div>

            <div class="auth-input-group" style="margin-bottom: 14px;">
              <label class="auth-input-label" for="auth-password" style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${t("password")}</label>
              <input type="password" id="auth-password" class="auth-input" placeholder="••••••••" minlength="6" required autocomplete="current-password" style="width: 100%; padding: 11px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 600;" />
            </div>

            <div id="forgot-password-wrap" style="text-align: right; margin-top: -6px; margin-bottom: 16px; display: ${authMode === 'signin' ? 'block' : 'none'};">
              <button type="button" id="auth-forgot-btn" style="background: none; border: none; color: var(--gold); font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: underline;">
                ${t("forgotPassword")}
              </button>
            </div>

            <button type="submit" id="auth-submit-btn" class="auth-submit-btn" style="width: 100%; padding: 13px; border-radius: var(--radius); background: var(--gold); border: none; color: #000; font-size: 13.5px; font-weight: 800; cursor: pointer; box-shadow: var(--btn-shadow); display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.2s ease;">
              <span id="auth-btn-text">${authMode === 'signin' ? (isEn ? 'Sign In' : 'เข้าสู่ระบบ') : (isEn ? 'Create Account' : 'สร้างบัญชีผู้ใช้')}</span>
              <div id="auth-spinner" class="spinner hidden" style="width: 16px; height: 16px; border-width: 2px; border-color: #000 transparent #000 transparent;"></div>
            </button>
          </form>

          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 18px; padding: 10px; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 12px; color: var(--income); font-size: 11.5px; font-weight: 600; text-align: center; line-height: 1.3;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>${t("cloudSecure")}</span>
          </div>
        </div>

        <!-- Back link -->
        <div style="text-align: center; margin-top: 20px;">
          <button id="auth-back-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            ${t("backToHome")}
          </button>
        </div>
      </div>
    </div>
  `;

  setupEventListeners(container);
}

function translateAuthError(errMessage, lang = "th") {
  const msg = errMessage ? errMessage.toLowerCase() : "";

  if (lang === "th") {
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid credentials")
    ) {
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
    }
    if (
      msg.includes("user already registered") ||
      msg.includes("user_already_exists")
    ) {
      return "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเลือกแท็บ 'เข้าสู่ระบบ'";
    }
    if (msg.includes("password should be at least 6 characters")) {
      return "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
    }
    if (msg.includes("signup requires a valid password")) {
      return "กรุณากรอกรหัสผ่านที่ถูกต้อง";
    }
    if (
      msg.includes("unable to validate email address") ||
      msg.includes("email structure is invalid") ||
      msg.includes("invalid email")
    ) {
      return "รูปแบบของอีเมลไม่ถูกต้อง";
    }
    if (
      msg.includes("rate limit exceeded") ||
      msg.includes("too many requests")
    ) {
      return "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
    }
    if (
      msg.includes("email not confirmed") ||
      msg.includes("email_not_confirmed")
    ) {
      return "อีเมลนี้ยังไม่ได้ยืนยันตัวตน กรุณาตรวจสอบลิงก์ในกล่องจดหมายของคุณ";
    }
    return `เกิดข้อผิดพลาด: ${errMessage}`;
  } else {
    // English
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid credentials")
    ) {
      return "Invalid email or password. Please check and try again.";
    }
    if (
      msg.includes("user already registered") ||
      msg.includes("user_already_exists")
    ) {
      return "This email is already registered. Please select the 'Sign In' tab.";
    }
    if (msg.includes("password should be at least 6 characters")) {
      return "Password must be at least 6 characters long.";
    }
    if (msg.includes("signup requires a valid password")) {
      return "Please enter a valid password.";
    }
    if (
      msg.includes("unable to validate email address") ||
      msg.includes("invalid email")
    ) {
      return "Invalid email format.";
    }
    if (msg.includes("rate limit")) {
      return "Too many requests. Please try again later.";
    }
    if (msg.includes("email not confirmed")) {
      return "Email address is not confirmed yet. Please check your inbox for the verification link.";
    }
    return errMessage;
  }
}

function setupEventListeners(container) {
  const form = container.querySelector("#auth-form");
  const submitBtn = container.querySelector("#auth-submit-btn");
  const btnText = container.querySelector("#auth-btn-text");
  const spinner = container.querySelector("#auth-spinner");
  const backBtn = container.querySelector("#auth-back-btn");
  const forgotBtn = container.querySelector("#auth-forgot-btn");
  const tabSignIn = container.querySelector("#tab-signin");
  const tabSignUp = container.querySelector("#tab-signup");
  const headerDesc = container.querySelector("#auth-header-desc");
  const forgotWrap = container.querySelector("#forgot-password-wrap");

  const isEn = store.settings.language === "en";
  const lang = isEn ? "en" : "th";

  // Tab Switching
  tabSignIn?.addEventListener("click", () => {
    authMode = "signin";
    tabSignIn.classList.add("active");
    tabSignUp.classList.remove("active");
    btnText.textContent = isEn ? "Sign In" : "เข้าสู่ระบบ";
    headerDesc.textContent = isEn ? "Welcome back! Enter your credentials to sync." : "ยินดีต้อนรับกลับ! เข้าสู่ระบบเพื่อซิงค์ข้อมูล";
    forgotWrap.style.display = "block";
  });

  tabSignUp?.addEventListener("click", () => {
    authMode = "signup";
    tabSignUp.classList.add("active");
    tabSignIn.classList.remove("active");
    btnText.textContent = isEn ? "Create Account" : "สร้างบัญชีผู้ใช้";
    headerDesc.textContent = isEn ? "Create a free account to back up and sync across devices." : "สร้างบัญชีฟรีเพื่อสำรองข้อมูลและใช้งานได้ทุกอุปกรณ์";
    forgotWrap.style.display = "none";
  });

  backBtn.addEventListener("click", () => {
    router.navigate("dashboard");
  });

  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      const email = await alerts.promptForgotPassword();
      if (email) {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
          });
          if (error) {
            alerts.error(
              t("resetFailed"),
              translateAuthError(error.message, lang),
            );
          } else {
            alerts.success(
              t("linkSent"),
              t("resetLinkSentBody"),
            );
          }
        } catch (err) {
          alerts.error(t("resetFailed"), err.message);
        }
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#auth-email").value.trim();
    const password = container.querySelector("#auth-password").value;

    submitBtn.disabled = true;
    btnText.textContent = t("processing");
    spinner.classList.remove("hidden");

    try {
      if (authMode === "signin") {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(translateAuthError(error.message, lang));
        }

        btnText.textContent = isEn ? "Syncing..." : "กำลังซิงค์ข้อมูล...";
        await store.handleLoginSync(data.user, { ignoreLocalStorage: true });
        alerts.success(t("authSuccess"));
        router.navigate("dashboard");
      } else {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw new Error(translateAuthError(error.message, lang));
        }

        // Check if user already exists
        const userExists =
          data.user &&
          data.user.identities &&
          data.user.identities.length === 0;

        if (userExists) {
          throw new Error(translateAuthError("User already registered", lang));
        }

        if (data.session) {
          btnText.textContent = isEn ? "Syncing..." : "กำลังซิงค์ข้อมูล...";
          await store.handleLoginSync(data.user, { ignoreLocalStorage: false });
          alerts.success(t("signUpSuccess"));
          router.navigate("dashboard");
        } else {
          alerts.success(t("authCheckEmailTitle"), t("authCheckEmailDesc"));
          router.navigate("dashboard");
        }
      }
    } catch (err) {
      console.error("Auth submit error:", err);
      alerts.error(isEn ? "Authentication Failed" : "เข้าสู่ระบบไม่สำเร็จ", err.message);
      submitBtn.disabled = false;
      btnText.textContent = authMode === "signin" ? (isEn ? "Sign In" : "เข้าสู่ระบบ") : (isEn ? "Create Account" : "สร้างบัญชีผู้ใช้");
      spinner.classList.add("hidden");
    }
  });
}
