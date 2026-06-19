import { store } from '../store.js';
import { alerts } from './alertHelper.js';
import { t } from '../i18n.js';
import Swal from 'sweetalert2';

const FINTRACK_VERSION = '1.0';
const FILE_EXTENSION = '.fintrack';

// ─── EXPORT ────────────────────────────────────────────────────────────────

/**
 * Exports all user data as a downloadable .fintrack file.
 * The file is a JSON bundle containing transactions, recurring rules, and settings.
 */
export function exportData() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // e.g. 2026-06-18

  const payload = {
    _fintrack: true,
    version: FINTRACK_VERSION,
    exportedAt: now.toISOString(),
    data: {
      transactions: store.transactions.map(t => ({
        ...t,
        date: t.date instanceof Date ? t.date.toISOString() : t.date,
      })),
      recurringRules: store.recurringRules.map(r => ({
        ...r,
        nextDueDate: r.nextDueDate instanceof Date ? r.nextDueDate.toISOString() : r.nextDueDate,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
      settings: { ...store.settings },
    },
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `fintrack_backup_${dateStr}${FILE_EXTENSION}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  alerts.success(
    t('exportSuccessTitle'),
    t('exportSuccessDesc')
  );
}

// ─── IMPORT ────────────────────────────────────────────────────────────────

/**
 * Opens a file picker and imports a .fintrack backup file.
 * Prompts the user to choose Merge or Replace mode.
 */
export function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = `${FILE_EXTENSION},application/json`;

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      // Validate file structure
      if (!payload._fintrack || !payload.data) {
        alerts.error(t('importErrorTitle'), t('importErrorInvalidFile'));
        return;
      }

      const isDark = store.settings.isDarkMode;
      const lang = store.settings.language;

      // Ask the user: Merge or Replace?
      const result = await Swal.fire({
        title: lang === 'en' ? 'Import Mode' : 'โหมดนำเข้า',
        html: `
          <p style="font-size:13px; margin-bottom:16px; color: ${isDark ? '#9CA3AF' : '#6B7280'}">
            ${lang === 'en'
              ? `<strong>${file.name}</strong><br>Exported: ${new Date(payload.exportedAt).toLocaleString()}<br>${payload.data.transactions?.length ?? 0} transactions · ${payload.data.recurringRules?.length ?? 0} recurring rules`
              : `<strong>${file.name}</strong><br>ส่งออกเมื่อ: ${new Date(payload.exportedAt).toLocaleString('th-TH')}<br>${payload.data.transactions?.length ?? 0} รายการ · ${payload.data.recurringRules?.length ?? 0} รายการประจำ`
            }
          </p>
          <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
            <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; padding:12px; border-radius:10px; border: 1px solid ${isDark ? '#374151' : '#E5E7EB'}; background: ${isDark ? '#1C2128' : '#F9FAFB'};">
              <input type="radio" name="import-mode" value="merge" checked style="margin-top:3px; accent-color:#FFB800;" />
              <div>
                <div style="font-weight:600; font-size:13px; color: ${isDark ? '#F9FAFB' : '#1F2937'}">
                  ${lang === 'en' ? '🔀 Merge' : '🔀 รวมข้อมูล (Merge)'}
                </div>
                <div style="font-size:11px; color: ${isDark ? '#9CA3AF' : '#6B7280'}; margin-top:2px;">
                  ${lang === 'en' ? 'Keeps your existing data and adds new records from the file. Duplicates are skipped.' : 'เก็บข้อมูลเดิมไว้ แล้วเพิ่มรายการใหม่จากไฟล์ รายการซ้ำจะถูกข้ามโดยอัตโนมัติ'}
                </div>
              </div>
            </label>
            <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; padding:12px; border-radius:10px; border: 1px solid ${isDark ? '#374151' : '#E5E7EB'}; background: ${isDark ? '#1C2128' : '#F9FAFB'};">
              <input type="radio" name="import-mode" value="replace" style="margin-top:3px; accent-color:#FFB800;" />
              <div>
                <div style="font-weight:600; font-size:13px; color: ${isDark ? '#F9FAFB' : '#1F2937'}">
                  ${lang === 'en' ? '🔄 Replace' : '🔄 แทนที่ข้อมูล (Replace)'}
                </div>
                <div style="font-size:11px; color: ${isDark ? '#9CA3AF' : '#6B7280'}; margin-top:2px;">
                  ${lang === 'en' ? 'Wipes all current data and loads the file. This cannot be undone.' : 'ลบข้อมูลปัจจุบันทั้งหมดและโหลดข้อมูลจากไฟล์ ไม่สามารถย้อนกลับได้'}
                </div>
              </div>
            </label>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#FFB800',
        cancelButtonColor: '#6B7280',
        confirmButtonText: lang === 'en' ? 'Import' : 'นำเข้า',
        cancelButtonText: lang === 'en' ? 'Cancel' : 'ยกเลิก',
        background: isDark ? '#161B22' : '#FFFFFF',
        color: isDark ? '#F9FAFB' : '#1F2937',
        preConfirm: () => {
          const selected = document.querySelector('input[name="import-mode"]:checked');
          return selected ? selected.value : 'merge';
        }
      });

      if (!result.isConfirmed) return;

      const mode = result.value; // 'merge' or 'replace'
      applyImport(payload.data, mode);

    } catch (err) {
      console.error('Import error:', err);
      alerts.error(t('importErrorTitle'), t('importErrorParseError'));
    }
  });

  input.click();
}

// ─── APPLY IMPORT ──────────────────────────────────────────────────────────

function applyImport(data, mode) {
  const incoming = {
    transactions: (data.transactions || []).map(tx => ({
      ...tx,
      date: new Date(tx.date),
      amount: parseFloat(tx.amount),
    })),
    recurringRules: (data.recurringRules || []).map(r => ({
      ...r,
      nextDueDate: new Date(r.nextDueDate),
      createdAt: new Date(r.createdAt),
      amount: parseFloat(r.amount),
    })),
    settings: data.settings || {},
  };

  if (mode === 'replace') {
    // Wipe and replace
    store.transactions = incoming.transactions;
    store.recurringRules = incoming.recurringRules;
    // Merge settings carefully (keep current theme/language unless file has them)
    store.settings = { ...store.settings, ...incoming.settings };
  } else {
    // Merge mode — deduplicate by ID
    const existingTxIds = new Set(store.transactions.map(t => t.id));
    const existingRuleIds = new Set(store.recurringRules.map(r => r.id));

    const newTx = incoming.transactions.filter(t => !existingTxIds.has(t.id));
    const newRules = incoming.recurringRules.filter(r => !existingRuleIds.has(r.id));

    store.transactions = [...store.transactions, ...newTx];
    store.recurringRules = [...store.recurringRules, ...newRules];
  }

  // Apply theme immediately if settings were imported
  document.documentElement.setAttribute('data-theme', store.settings.isDarkMode ? 'dark' : 'light');
  document.documentElement.lang = store.settings.language === 'en' ? 'en' : 'th';

  store.save();

  const lang = store.settings.language;
  alerts.success(
    lang === 'en' ? 'Import Complete!' : 'นำเข้าสำเร็จ!',
    lang === 'en'
      ? `${mode === 'replace' ? 'Data replaced' : 'Data merged'} successfully.`
      : `${mode === 'replace' ? 'แทนที่ข้อมูล' : 'รวมข้อมูล'}เรียบร้อยแล้ว`
  );
}

// ─── TEXT CODE TRANSFER ──────────────────────────────────────────────────

/**
 * Exports all user data as a compressed Base64 text string copied to clipboard.
 */
export async function exportToText() {
  try {
    const payload = {
      _fintrack: true,
      version: FINTRACK_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        transactions: store.transactions.map(t => ({
          ...t,
          date: t.date instanceof Date ? t.date.toISOString() : t.date,
        })),
        recurringRules: store.recurringRules.map(r => ({
          ...r,
          nextDueDate: r.nextDueDate instanceof Date ? r.nextDueDate.toISOString() : r.nextDueDate,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        })),
        settings: { ...store.settings },
      },
    };

    const json = JSON.stringify(payload);
    const base64Text = btoa(unescape(encodeURIComponent(json)));

    const isDark = store.settings.isDarkMode;
    const lang = store.settings.language;

    try {
      await navigator.clipboard.writeText(base64Text);
      alerts.success(
        lang === 'en' ? 'Code Copied!' : 'คัดลอกรหัสสำเร็จ!',
        lang === 'en'
          ? 'Backup code copied to clipboard. Paste it on the other device.'
          : 'รหัสสำรองข้อมูลถูกบันทึกแล้ว นำรหัสไปวางในปุ่มนำเข้าในอีกอุปกรณ์ได้เลย'
      );
    } catch (clipErr) {
      // Fallback popup if clipboard write is blocked by browser security
      Swal.fire({
        title: lang === 'en' ? 'Copy Backup Code' : 'คัดลอกรหัสสำรองข้อมูล',
        html: `
          <p style="font-size:12px; color: ${isDark ? '#9CA3AF' : '#6B7280'}; margin-bottom:12px;">
            ${lang === 'en' 
              ? 'Clipboard access blocked. Please copy the code below manually:' 
              : 'เบราว์เซอร์บล็อกการคัดลอกอัตโนมัติ กรุณากดคัดลอกข้อความด้านล่างนี้ด้วยตนเอง:'}
          </p>
          <textarea readonly style="width:100%; height:120px; font-family:monospace; font-size:10px; padding:10px; border-radius:10px; border:1px solid ${isDark ? '#374151' : '#E5E7EB'}; background:${isDark ? '#1F2937' : '#F9FAFB'}; color:${isDark ? '#F9FAFB' : '#1F2937'}; resize:none;" onclick="this.select()">${base64Text}</textarea>
        `,
        confirmButtonColor: '#FFB800',
        confirmButtonText: lang === 'en' ? 'Done' : 'เสร็จสิ้น',
        background: isDark ? '#161B22' : '#FFFFFF',
        color: isDark ? '#F9FAFB' : '#1F2937',
      });
    }
  } catch (err) {
    console.error('Export code error:', err);
    alerts.error(
      store.settings.language === 'en' ? 'Export Failed' : 'ส่งออกไม่สำเร็จ',
      err.message
    );
  }
}

/**
 * Prompts the user to paste a backup text code and handles decoding and importing.
 */
export async function importFromText() {
  const isDark = store.settings.isDarkMode;
  const lang = store.settings.language;

  const { value: pastedText } = await Swal.fire({
    title: lang === 'en' ? 'Import from Text Code' : 'นำเข้าจากรหัสข้อความ',
    input: 'textarea',
    inputPlaceholder: lang === 'en' ? 'Paste your backup code here...' : 'วางรหัสสำรองข้อมูลที่คัดลอกมาที่นี่...',
    inputAttributes: {
      autocorrect: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      style: `font-family:monospace; font-size:11px; height:140px; border-radius:10px; border:1px solid ${isDark ? '#374151' : '#E5E7EB'}; background:${isDark ? '#1C2128' : '#0F172A'}; color:${isDark ? '#F9FAFB' : '#F8FAFC'};`
    },
    showCancelButton: true,
    confirmButtonColor: '#FFB800',
    cancelButtonColor: '#6B7280',
    confirmButtonText: lang === 'en' ? 'Verify Code' : 'ตรวจสอบรหัส',
    cancelButtonText: lang === 'en' ? 'Cancel' : 'ยกเลิก',
    background: isDark ? '#161B22' : '#FFFFFF',
    color: isDark ? '#F9FAFB' : '#1F2937',
  });

  if (!pastedText) return;

  const cleanedText = pastedText.trim().replace(/\s/g, '');

  try {
    const decodedJson = decodeURIComponent(escape(atob(cleanedText)));
    const payload = JSON.parse(decodedJson);

    // Validate structure
    if (!payload._fintrack || !payload.data) {
      alerts.error(
        lang === 'en' ? 'Invalid Code' : 'รหัสไม่ถูกต้อง',
        lang === 'en' 
          ? 'The backup code is invalid or corrupted.' 
          : 'รหัสข้อมูลสำรองไม่ถูกต้อง หรือรูปแบบไม่ตรงตามที่กำหนด'
      );
      return;
    }

    // Ask: Merge or Replace?
    const result = await Swal.fire({
      title: lang === 'en' ? 'Import Mode' : 'โหมดนำเข้า',
      html: `
        <p style="font-size:13px; margin-bottom:16px; color: ${isDark ? '#9CA3AF' : '#6B7280'}">
          ${lang === 'en'
            ? `<strong>Backup Data</strong><br>Exported: ${new Date(payload.exportedAt).toLocaleString()}<br>${payload.data.transactions?.length ?? 0} transactions · ${payload.data.recurringRules?.length ?? 0} recurring rules`
            : `<strong>ข้อมูลสำรอง</strong><br>ส่งออกเมื่อ: ${new Date(payload.exportedAt).toLocaleString('th-TH')}<br>${payload.data.transactions?.length ?? 0} รายการ · ${payload.data.recurringRules?.length ?? 0} รายการประจำ`
          }
        </p>
        <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
          <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; padding:12px; border-radius:10px; border: 1px solid ${isDark ? '#374151' : '#E5E7EB'}; background: ${isDark ? '#1C2128' : '#F9FAFB'};">
            <input type="radio" name="import-mode" value="merge" checked style="margin-top:3px; accent-color:#FFB800;" />
            <div>
              <div style="font-weight:600; font-size:13px; color: ${isDark ? '#F9FAFB' : '#1F2937'}">
                ${lang === 'en' ? '🔀 Merge' : '🔀 รวมข้อมูล (Merge)'}
              </div>
              <div style="font-size:11px; color: ${isDark ? '#9CA3AF' : '#6B7280'}; margin-top:2px;">
                ${lang === 'en' ? 'Keeps your existing data and adds new records from the code. Duplicates are skipped.' : 'เก็บข้อมูลเดิมไว้ แล้วเพิ่มรายการใหม่จากรหัส รายการซ้ำจะถูกข้ามโดยอัตโนมัติ'}
              </div>
            </div>
          </label>
          <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; padding:12px; border-radius:10px; border: 1px solid ${isDark ? '#374151' : '#E5E7EB'}; background: ${isDark ? '#1C2128' : '#F9FAFB'};">
            <input type="radio" name="import-mode" value="replace" style="margin-top:3px; accent-color:#FFB800;" />
            <div>
              <div style="font-weight:600; font-size:13px; color: ${isDark ? '#F9FAFB' : '#1F2937'}">
                ${lang === 'en' ? '🔄 Replace' : '🔄 แทนที่ข้อมูล (Replace)'}
              </div>
              <div style="font-size:11px; color: ${isDark ? '#9CA3AF' : '#6B7280'}; margin-top:2px;">
                ${lang === 'en' ? 'Wipes all current data and loads the code backup. This cannot be undone.' : 'ลบข้อมูลปัจจุบันทั้งหมดและโหลดข้อมูลใหม่ทดแทน ไม่สามารถย้อนกลับได้'}
              </div>
            </div>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#FFB800',
      cancelButtonColor: '#6B7280',
      confirmButtonText: lang === 'en' ? 'Import' : 'นำเข้า',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'ยกเลิก',
      background: isDark ? '#161B22' : '#FFFFFF',
      color: isDark ? '#F9FAFB' : '#1F2937',
      preConfirm: () => {
        const selected = document.querySelector('input[name="import-mode"]:checked');
        return selected ? selected.value : 'merge';
      }
    });

    if (!result.isConfirmed) return;

    const mode = result.value; // 'merge' or 'replace'
    applyImport(payload.data, mode);

  } catch (err) {
    console.error('Import text code error:', err);
    alerts.error(
      lang === 'en' ? 'Failed to Decode' : 'นำเข้ารหัสล้มเหลว',
      lang === 'en'
        ? 'Please check if the copied code is complete and correct.'
        : 'โปรดตรวจสอบความถูกต้องว่าท่านได้คัดลอกรหัสมาครบถ้วนและถูกต้อง'
    );
  }
}
