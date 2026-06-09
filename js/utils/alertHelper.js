import Swal from 'sweetalert2';
import { store } from '../store.js';

export const alerts = {
  success(title, text = '') {
    const isDark = store.settings.isDarkMode;
    return Swal.fire({
      title: title,
      text: text,
      icon: 'success',
      background: isDark ? '#1C2128' : '#FFFFFF',
      color: isDark ? '#FFFFFF' : '#1F2937',
      confirmButtonColor: '#FFB800',
      confirmButtonText: store.settings.language === 'en' ? 'OK' : 'ตกลง'
    });
  },
  
  error(title, text = '') {
    const isDark = store.settings.isDarkMode;
    return Swal.fire({
      title: title,
      text: text,
      icon: 'error',
      background: isDark ? '#1C2128' : '#FFFFFF',
      color: isDark ? '#FFFFFF' : '#1F2937',
      confirmButtonColor: '#FFB800',
      confirmButtonText: store.settings.language === 'en' ? 'OK' : 'ตกลง'
    });
  },
  
  warning(title, text = '') {
    const isDark = store.settings.isDarkMode;
    return Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      background: isDark ? '#1C2128' : '#FFFFFF',
      color: isDark ? '#FFFFFF' : '#1F2937',
      confirmButtonColor: '#FFB800',
      confirmButtonText: store.settings.language === 'en' ? 'OK' : 'ตกลง'
    });
  },

  info(title, text = '') {
    const isDark = store.settings.isDarkMode;
    return Swal.fire({
      title: title,
      text: text,
      icon: 'info',
      background: isDark ? '#1C2128' : '#FFFFFF',
      color: isDark ? '#FFFFFF' : '#1F2937',
      confirmButtonColor: '#FFB800',
      confirmButtonText: store.settings.language === 'en' ? 'OK' : 'ตกลง'
    });
  },

  async confirmDelete(title, text = '') {
    const isDark = store.settings.isDarkMode;
    const result = await Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      background: isDark ? '#1C2128' : '#FFFFFF',
      color: isDark ? '#FFFFFF' : '#1F2937',
      confirmButtonColor: '#EF4444', // Red for delete action
      cancelButtonColor: '#6B7280',
      confirmButtonText: store.settings.language === 'en' ? 'Delete' : 'ลบรายการ',
      cancelButtonText: store.settings.language === 'en' ? 'Cancel' : 'ยกเลิก'
    });
    return result.isConfirmed;
  },

  async confirmReset(title, text = '') {
    const isDark = store.settings.isDarkMode;
    const result = await Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      background: isDark ? '#1C2128' : '#FFFFFF',
      color: isDark ? '#FFFFFF' : '#1F2937',
      confirmButtonColor: '#EF4444', // Red for reset/clear action
      cancelButtonColor: '#6B7280',
      confirmButtonText: store.settings.language === 'en' ? 'Yes, Reset' : 'ใช่, รีเซ็ตข้อมูล',
      cancelButtonText: store.settings.language === 'en' ? 'Cancel' : 'ยกเลิก'
    });
    return result.isConfirmed;
  }
};
