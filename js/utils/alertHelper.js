import Swal from "sweetalert2";
import { store } from "../store.js";

export function formatFriendlyError(error, lang = store.settings.language || "th") {
  if (!error) return "";
  const rawMsg = typeof error === "string" ? error : (error.message || error.details || error.hint || String(error));
  const msg = (rawMsg || "").toLowerCase();

  if (lang === "th") {
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials") || msg.includes("invalid_grant")) {
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    }
    if (msg.includes("user already registered") || msg.includes("user_already_exists") || (msg.includes("422") && msg.includes("signup"))) {
      return "อีเมลนี้มีผู้ใช้งานแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านของคุณ";
    }
    if (msg.includes("password should be at least 6 characters") || msg.includes("password must be")) {
      return "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
    }
    if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
      return "กรุณายืนยันอีเมลในกล่องจดหมายของคุณก่อนเข้าสู่ระบบ";
    }
    if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed")) {
      return "ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง";
    }
    if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("over_email_send_rate_limit")) {
      return "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
    }
    if (msg.includes("jwt expired") || msg.includes("session expired") || msg.includes("token is expired")) {
      return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
    }
    if (msg.includes("pgrst") || msg.includes("schema cache") || msg.includes("column") || msg.includes("syntax error") || msg.includes("database")) {
      return "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง";
    }
    if (msg.includes("is not a function") || msg.includes("typeerror") || msg.includes("cannot read properties")) {
      return "เกิดข้อผิดพลาดในการประมวลผล กรุณารีเฟรชหน้าจอแล้วลองใหม่";
    }
    if (msg.includes("category name is required")) {
      return "กรุณากรอกชื่อหมวดหมู่";
    }
    if (msg.includes("category already exists")) {
      return "มีหมวดหมู่นี้อยู่แล้ว";
    }
    if (msg.includes("no qr") || msg.includes("no receipt")) {
      return "ไม่พบ QR Code หรือใบเสร็จที่อ่านได้ กรุณาใช้ภาพที่ชัดเจนขึ้น";
    }
    if (rawMsg.startsWith("ข้อผิดพลาด") || rawMsg.startsWith("เกิดข้อผิดพลาด") || rawMsg.startsWith("กรุณา") || rawMsg.startsWith("ไม่พบ") || rawMsg.startsWith("จำนวน") || rawMsg.startsWith("ยอดเงิน") || rawMsg.startsWith("ไม่รองรับ") || rawMsg.startsWith("อีเมล")) {
      return rawMsg;
    }
    return "เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่อีกครั้ง";
  } else {
    // English
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials") || msg.includes("invalid_grant")) {
      return "Invalid email or password.";
    }
    if (msg.includes("user already registered") || msg.includes("user_already_exists") || (msg.includes("422") && msg.includes("signup"))) {
      return "This email is already registered. Please sign in with your password.";
    }
    if (msg.includes("password should be at least 6 characters") || msg.includes("password must be")) {
      return "Password must be at least 6 characters.";
    }
    if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
      return "Please verify your email address before signing in.";
    }
    if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed")) {
      return "Network connection failed. Please check your internet connection.";
    }
    if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("over_email_send_rate_limit")) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (msg.includes("jwt expired") || msg.includes("session expired") || msg.includes("token is expired")) {
      return "Your session has expired. Please sign in again.";
    }
    if (msg.includes("pgrst") || msg.includes("schema cache") || msg.includes("column") || msg.includes("syntax error") || msg.includes("database")) {
      return "Unable to save data. Please try again.";
    }
    if (msg.includes("is not a function") || msg.includes("typeerror") || msg.includes("cannot read properties")) {
      return "An unexpected processing error occurred. Please refresh the page.";
    }
    if (msg.includes("category name is required")) {
      return "Category name is required.";
    }
    if (msg.includes("category already exists")) {
      return "Category already exists.";
    }
    return rawMsg;
  }
}

export const alerts = {
  success(title, text = "") {
    const isDark = store.settings.isDarkMode;
    return Swal.fire({
      title: title,
      text: text,
      icon: "success",
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      confirmButtonText: store.settings.language === "en" ? "OK" : "ตกลง",
    });
  },

  error(title, text = "") {
    const isDark = store.settings.isDarkMode;
    const lang = store.settings.language || "th";
    
    // Sanitize technical messages
    let cleanTitle = title;
    let cleanText = text;

    if (text) {
      cleanText = formatFriendlyError(text, lang);
    } else if (title) {
      cleanTitle = formatFriendlyError(title, lang);
    }

    return Swal.fire({
      title: cleanTitle,
      text: cleanText,
      icon: "error",
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      confirmButtonText: lang === "en" ? "OK" : "ตกลง",
    });
  },

  warning(title, text = "") {
    const isDark = store.settings.isDarkMode;
    const lang = store.settings.language || "th";
    return Swal.fire({
      title: title,
      text: text ? formatFriendlyError(text, lang) : "",
      icon: "warning",
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      confirmButtonText: lang === "en" ? "OK" : "ตกลง",
    });
  },

  info(title, text = "") {
    const isDark = store.settings.isDarkMode;
    return Swal.fire({
      title: title,
      text: text,
      icon: "info",
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      confirmButtonText: store.settings.language === "en" ? "OK" : "ตกลง",
    });
  },

  async confirmDelete(title, text = "") {
    const isDark = store.settings.isDarkMode;
    const result = await Swal.fire({
      title: title,
      text: text,
      icon: "warning",
      showCancelButton: true,
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#EF4444", // Red for delete action
      cancelButtonColor: "#6B7280",
      confirmButtonText:
        store.settings.language === "en" ? "Delete" : "ลบรายการ",
      cancelButtonText: store.settings.language === "en" ? "Cancel" : "ยกเลิก",
    });
    return result.isConfirmed;
  },

  async prompt(title, inputLabel = "", input = "text", inputValue = "", options = {}) {
    const isDark = store.settings.isDarkMode;
    return Swal.fire({
      title,
      input,
      inputLabel,
      inputValue,
      inputAttributes: options.inputAttributes || {},
      showCancelButton: true,
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      cancelButtonColor: "#6B7280",
      confirmButtonText: store.settings.language === "en" ? "Save" : "บันทึก",
      cancelButtonText: store.settings.language === "en" ? "Cancel" : "ยกเลิก",
    });
  },

  async confirmReset(title, text = "") {
    const isDark = store.settings.isDarkMode;
    const result = await Swal.fire({
      title: title,
      text: text,
      icon: "warning",
      showCancelButton: true,
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#EF4444", // Red for reset/clear action
      cancelButtonColor: "#6B7280",
      confirmButtonText:
        store.settings.language === "en" ? "Yes, Reset" : "ใช่, รีเซ็ตข้อมูล",
      cancelButtonText: store.settings.language === "en" ? "Cancel" : "ยกเลิก",
    });
    return result.isConfirmed;
  },

  async promptPasswordChange() {
    const isDark = store.settings.isDarkMode;
    const lang = store.settings.language;
    const { value: newPassword } = await Swal.fire({
      title: lang === 'en' ? 'Change Password' : 'เปลี่ยนรหัสผ่าน',
      input: 'password',
      inputLabel: lang === 'en' ? 'Enter new password (at least 6 characters)' : 'ป้อนรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)',
      inputPlaceholder: '••••••••',
      inputAttributes: {
        minlength: '6',
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      cancelButtonColor: "#6B7280",
      customClass: {
        backdrop: 'swal2-backdrop-blur'
      },
      confirmButtonText: lang === 'en' ? 'Update' : 'อัปเดต',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'ยกเลิก',
      inputValidator: (value) => {
        if (!value || value.length < 6) {
          return lang === 'en' ? 'Password must be at least 6 characters!' : 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร!';
        }
      }
    });
    return newPassword;
  },

  async promptForgotPassword() {
    const isDark = store.settings.isDarkMode;
    const lang = store.settings.language;
    const { value: email } = await Swal.fire({
      title: lang === 'en' ? 'Forgot Password' : 'ลืมรหัสผ่าน',
      input: 'email',
      inputLabel: lang === 'en' ? 'Enter your email address' : 'ป้อนอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน',
      inputPlaceholder: 'email@example.com',
      showCancelButton: true,
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      cancelButtonColor: "#6B7280",
      confirmButtonText: lang === 'en' ? 'Send Link' : 'ส่งลิงก์',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'ยกเลิก',
      inputValidator: (value) => {
        if (!value) {
          return lang === 'en' ? 'Please enter a valid email!' : 'กรุณากรอกอีเมลที่ถูกต้อง!';
        }
      }
    });
    return email;
  },

  async confirmLoginIgnoreLocalStorage() {
    const isDark = store.settings.isDarkMode;
    const lang = store.settings.language;
    const result = await Swal.fire({
      title: lang === 'en' ? 'Warning: Ignore Local Data?' : 'คำเตือนการเข้าสู่ระบบ',
      text: lang === 'en'
        ? 'Logging in will ignore local data stored on this device (LocalStorage) and load data from your cloud account. Do you want to continue?'
        : 'การเข้าสู่ระบบจะข้าม/ไม่นำเข้าข้อมูลในเครื่อง (LocalStorage) ไปยังบัญชีของคุณ และจะใช้ข้อมูลจากคลาวด์แทน คุณต้องการดำเนินการต่อหรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      cancelButtonColor: "#6B7280",
      confirmButtonText: lang === 'en' ? 'Continue Login' : 'ดำเนินการเข้าสู่ระบบ',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'ยกเลิก',
    });
    return result.isConfirmed;
  },
};
