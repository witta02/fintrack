import Swal from "sweetalert2";
import { store } from "../store.js";

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
    return Swal.fire({
      title: title,
      text: text,
      icon: "error",
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      confirmButtonText: store.settings.language === "en" ? "OK" : "ตกลง",
    });
  },

  warning(title, text = "") {
    const isDark = store.settings.isDarkMode;
    return Swal.fire({
      title: title,
      text: text,
      icon: "warning",
      background: isDark ? "#1C2128" : "#FFFFFF",
      color: isDark ? "#FFFFFF" : "#1F2937",
      confirmButtonColor: "#FFB800",
      confirmButtonText: store.settings.language === "en" ? "OK" : "ตกลง",
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
};
