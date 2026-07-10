import { supabase } from "../supabase.js";
import { store } from "../store.js";
import { router } from "../router.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";

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
        </div>

        <!-- Form Card -->
        <div class="auth-form-card">
          <div class="auth-mode-title">${t("authTitleCombined")}</div>
          <div class="auth-mode-subtitle">
            ${t("authSubtitleCombined")}
          </div>

          <form id="auth-form">
            <div class="auth-input-group">
              <label class="auth-input-label" for="auth-email">${t("email")}</label>
              <input type="email" id="auth-email" class="auth-input" placeholder="email@example.com" required autocomplete="email" />
            </div>

            <div class="auth-input-group">
              <label class="auth-input-label" for="auth-password">${t("password")}</label>
              <input type="password" id="auth-password" class="auth-input" placeholder="••••••••" minlength="6" required autocomplete="current-password" />
            </div>

            <div style="text-align: right; margin-top: -8px; margin-bottom: 16px;">
              <button type="button" id="auth-forgot-btn" style="background: none; border: none; color: var(--gold); font-size: 12px; font-weight: 700; cursor: pointer; transition: color var(--transition);">
                ${store.settings.language === "en" ? "Forgot Password?" : "ลืมรหัสผ่านใช่หรือไม่?"}
              </button>
            </div>

            <button type="submit" id="auth-submit-btn" class="auth-submit-btn">
              <span id="auth-btn-text">${t("authTitleCombined")}</span>
              <div id="auth-spinner" class="spinner hidden"></div>
            </button>
          </form>

          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 20px; padding: 10px; background: rgba(52, 211, 153, 0.06); border: 1px solid rgba(52, 211, 153, 0.18); border-radius: 12px; color: var(--income); font-size: 11.5px; font-weight: 600; text-align: center; line-height: 1.3;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>${store.settings.language === "en" ? "Secured Cloud: Only you can access your data" : "ระบบคลาวด์ปลอดภัย: มีเพียงคุณเท่านั้นที่เข้าถึงข้อมูลได้"}</span>
          </div>
        </div>

        <!-- Back link -->
        <div style="text-align: center; margin-top: 20px;">
          <button id="auth-back-btn" style="background: none; border: none; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: color var(--transition); display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            ${store.settings.language === "en" ? "Back to Home" : "กลับไปหน้าแรก"}
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
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    }
    if (
      msg.includes("user already registered") ||
      msg.includes("user_already_exists")
    ) {
      return "อีเมลนี้ถูกลงทะเบียนไว้แล้วด้วยรหัสผ่านอื่น (กรุณาลองป้อนรหัสผ่านใหม่)";
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
    return `ข้อผิดพลาด: ${errMessage}`;
  } else {
    // English
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid credentials")
    ) {
      return "Invalid email or password.";
    }
    if (
      msg.includes("user already registered") ||
      msg.includes("user_already_exists")
    ) {
      return "This email is already registered with a different password.";
    }
    if (msg.includes("password should be at least 6 characters")) {
      return "Password should be at least 6 characters.";
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
      return "Email address is not confirmed yet. Please verify via confirmation email.";
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

  const lang = store.settings.language || "th";

  backBtn.addEventListener("click", () => {
    router.navigate("dashboard");
  });

  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      const email = await alerts.promptForgotPassword();
      if (email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) {
          alerts.error(
            lang === "en" ? "Reset Failed" : "ล้มเหลว",
            translateAuthError(error.message, lang),
          );
        } else {
          alerts.success(
            lang === "en" ? "Link Sent" : "ส่งลิงก์สำเร็จ",
            lang === "en"
              ? "A reset password link has been sent to your email address."
              : "เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบและดำเนินการต่อ",
          );
        }
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#auth-email").value.trim();
    const password = container.querySelector("#auth-password").value;

    submitBtn.disabled = true;
    btnText.textContent = lang === "en" ? "Processing..." : "กำลังดำเนินการ...";
    spinner.classList.remove("hidden");

    try {
      // 1. Attempt login first
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (!signInError) {
        // Login successful
        btnText.textContent = t("syncingData");
        await store.handleLoginSync(signInData.user);
        alerts.success(t("authSuccess"));
        router.navigate("dashboard");
        return;
      }

      // 2. If login fails with "Invalid login credentials", it could mean the user doesn't exist yet.
      // So, let's attempt to Register them.
      const isInvalidCredentials =
        signInError.message
          .toLowerCase()
          .includes("invalid login credentials") || signInError.status === 400;

      if (isInvalidCredentials) {
        // Attempt sign up
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
          });

        if (signUpError) {
          // If signUp fails with "User already registered", it means the email exists but password was wrong
          throw new Error(translateAuthError(signUpError.message, lang));
        }

        // If email verification is enabled and user already exists, Supabase returns a user object
        // with an empty identities array. Check this to prevent false 'Verification email sent' alerts.
        const userExists =
          signUpData.user &&
          signUpData.user.identities &&
          signUpData.user.identities.length === 0;

        if (userExists) {
          throw new Error(translateAuthError("User already registered", lang));
        }

        // SignUp successful
        if (signUpData.session) {
          btnText.textContent = t("syncingData");
          await store.handleLoginSync(signUpData.user);
          alerts.success(t("signUpSuccess"));
          router.navigate("dashboard");
        } else {
          // Email verification is enabled
          alerts.success(t("authCheckEmailTitle"), t("authCheckEmailDesc"));
          router.navigate("dashboard");
        }
      } else {
        // Other login errors (like rate limits, email not confirmed, etc.)
        throw new Error(translateAuthError(signInError.message, lang));
      }
    } catch (err) {
      console.error(err);
      alerts.error(lang === "en" ? "Failure" : "ล้มเหลว", err.message);
      submitBtn.disabled = false;
      btnText.textContent = t("authTitleCombined");
      spinner.classList.add("hidden");
    }
  });
}
