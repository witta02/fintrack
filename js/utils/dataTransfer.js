import { store } from '../store.js';
import { alerts } from './alertHelper.js';
import { t } from '../i18n.js';
import Swal from 'sweetalert2';

const FINTRACK_VERSION = '1.0';
const FILE_EXTENSION = '.fintrack';

function xorCipher(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

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

// ─── COMPRESSION SCHEMAS ──────────────────────────────────────────────────

function deflateToCompact(payload) {
  return {
    ft: 1, // FinTrack compact format v1
    t: new Date(payload.exportedAt).getTime(),
    tx: (payload.data.transactions || []).map(t => [
      t.id,
      t.title,
      t.amount,
      t.category,
      t.date instanceof Date ? t.date.getTime() : new Date(t.date).getTime(),
      t.isIncome ? 1 : 0
    ]),
    rr: (payload.data.recurringRules || []).map(r => [
      r.id,
      r.title,
      r.amount,
      r.isIncome ? 1 : 0,
      r.category,
      r.type,
      r.customDays || 30,
      r.nextDueDate instanceof Date ? r.nextDueDate.getTime() : new Date(r.nextDueDate).getTime(),
      r.isActive ? 1 : 0,
      r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime()
    ]),
    st: {
      c: payload.data.settings?.selectedCurrency || 'THB',
      d: payload.data.settings?.isDarkMode ? 1 : 0,
      l: payload.data.settings?.language || 'th',
      t: payload.data.settings?.taxDeduction || 60000
    }
  };
}

function inflateFromCompact(compact) {
  return {
    _fintrack: true,
    version: '1.0',
    exportedAt: new Date(compact.t).toISOString(),
    data: {
      transactions: (compact.tx || []).map(row => ({
        id: row[0],
        title: row[1],
        amount: parseFloat(row[2]),
        category: row[3],
        date: new Date(row[4]).toISOString(),
        isIncome: row[5] === 1
      })),
      recurringRules: (compact.rr || []).map(row => ({
        id: row[0],
        title: row[1],
        amount: parseFloat(row[2]),
        isIncome: row[3] === 1,
        category: row[4],
        type: row[5],
        customDays: parseInt(row[6] || 30),
        nextDueDate: new Date(row[7]).toISOString(),
        isActive: row[8] === 1,
        createdAt: new Date(row[9] || Date.now()).toISOString()
      })),
      settings: {
        selectedCurrency: compact.st?.c || 'THB',
        isDarkMode: compact.st?.d === 1,
        language: compact.st?.l || 'th',
        taxDeduction: parseFloat(compact.st?.t || 60000)
      }
    }
  };
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

    const compactPayload = deflateToCompact(payload);
    const json = JSON.stringify(compactPayload);
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
    let payload = JSON.parse(decodedJson);

    // If it's the compact schema format, inflate it back to full schema first
    if (payload && payload.ft === 1) {
      payload = inflateFromCompact(payload);
    }

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

// ─── 5-DIGIT CLOUD TRANSFER ──────────────────────────────────────────────

/**
 * Exports all user data to a temporary public ntfy topic and provides a 5-digit code.
 */
export async function exportToCloud() {
  const isDark = store.settings.isDarkMode;
  const lang = store.settings.language;

  // Show a loading alert
  Swal.fire({
    title: lang === 'en' ? 'Generating Code...' : 'กำลังสร้างรหัส...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
    background: isDark ? '#161B22' : '#FFFFFF',
    color: isDark ? '#F9FAFB' : '#1F2937',
  });

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

    const compactPayload = deflateToCompact(payload);
    const json = JSON.stringify(compactPayload);
    const binaryString = unescape(encodeURIComponent(json));
    const encrypted = xorCipher(binaryString, code);
    const base64Text = btoa(encrypted);

    // Generate random 5-digit code
    const code = Math.floor(10000 + Math.random() * 90000).toString();

    // Upload to ntfy topic as an attachment: fintrack-cloud-sync-<code>
    const response = await fetch(`https://ntfy.sh/fintrack-cloud-sync-${code}`, {
      method: 'PUT',
      body: base64Text,
      headers: {
        'X-Filename': 'backup.fintrack',
        'Title': 'FinTrack Backup',
        'Priority': '5'
      }
    });

    if (!response.ok) {
      throw new Error(lang === 'en' ? 'Failed to upload backup' : 'ไม่สามารถอัปโหลดข้อมูลสำรองได้');
    }

    // Close loading and show success
    Swal.fire({
      title: lang === 'en' ? 'Backup Ready!' : 'ข้อมูลสำรองพร้อมแล้ว!',
      html: `
        <p style="font-size:13px; color:${isDark ? '#9CA3AF' : '#6B7280'}; margin-bottom:16px;">
          ${lang === 'en'
            ? 'Your 5-digit temporary backup code is:'
            : 'รหัสสำรองข้อมูลชั่วคราว 5 หลักของคุณคือ:'
          }
        </p>
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px;">
          <div style="font-size:32px; font-family:monospace; font-weight:800; color:var(--gold); letter-spacing:4px; background:${isDark ? '#1C2128' : '#F9FAFB'}; padding:12px; border-radius:10px; border:1px solid ${isDark ? '#374151' : '#E5E7EB'}; flex: 1; text-align: center; display: flex; align-items: center; justify-content: center; height: 60px; box-sizing: border-box;">
            ${code}
          </div>
          <button id="copy-sync-code-btn" style="background: rgba(255, 184, 0, 0.1); border: 1.5px solid rgba(255, 184, 0, 0.22); color: var(--gold); height: 60px; width: 60px; padding: 0; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="${lang === 'en' ? 'Copy Code' : 'คัดลอกรหัส'}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>
        <p style="font-size:11px; color:#ef4444; line-height:1.5;">
          ${lang === 'en'
            ? '⚠️ This code is valid for 12 hours. Enter this code on your other device to pull and restore the data.'
            : '⚠️ รหัสนี้มีอายุการใช้งาน 12 ชั่วโมง นำรหัสไปป้อนในอีกเครื่องเพื่อดึงข้อมูลกลับมาและเชื่อมโยงข้อมูลให้ตรงกัน'
          }
        </p>
      `,
      confirmButtonColor: '#FFB800',
      confirmButtonText: lang === 'en' ? 'Done' : 'เสร็จสิ้น',
      background: isDark ? '#161B22' : '#FFFFFF',
      color: isDark ? '#F9FAFB' : '#1F2937',
      didOpen: () => {
        const btn = document.getElementById('copy-sync-code-btn');
        if (btn) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(code);
              btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
              btn.style.background = 'rgba(52, 211, 153, 0.15)';
              btn.style.borderColor = 'rgba(52, 211, 153, 0.3)';
              btn.style.color = '#34d399';
              setTimeout(() => {
                btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
                btn.style.background = 'rgba(255, 184, 0, 0.1)';
                btn.style.borderColor = 'rgba(255, 184, 0, 0.22)';
                btn.style.color = 'var(--gold)';
              }, 2000);
            } catch (err) {
              console.error('Failed to copy sync code:', err);
            }
          });
        }
      }
    });

  } catch (err) {
    console.error('Cloud export error:', err);
    alerts.error(
      lang === 'en' ? 'Cloud Backup Failed' : 'สำรองข้อมูลบนคลาวด์ไม่สำเร็จ',
      err.message
    );
  }
}

/**
 * Prompts the user to enter a 5-digit code, downloads data from public ntfy topic, and restores.
 */
export async function importFromCloud() {
  const isDark = store.settings.isDarkMode;
  const lang = store.settings.language;

  const { value: code } = await Swal.fire({
    title: lang === 'en' ? 'Import by 5-Digit Code' : 'นำเข้าผ่านรหัส 5 หลัก',
    input: 'text',
    inputPlaceholder: 'e.g. 12345',
    inputAttributes: {
      maxlength: '5',
      autofocus: 'true',
      style: `text-align:center; font-size:24px; font-weight:700; letter-spacing:4px; border-radius:10px; border:1px solid ${isDark ? '#374151' : '#E5E7EB'}; background:${isDark ? '#1F2937' : '#F9FAFB'}; color:${isDark ? '#F9FAFB' : '#1F2937'};`
    },
    showCancelButton: true,
    confirmButtonColor: '#FFB800',
    cancelButtonColor: '#6B7280',
    confirmButtonText: lang === 'en' ? 'Retrieve Data' : 'ดึงข้อมูล',
    cancelButtonText: lang === 'en' ? 'Cancel' : 'ยกเลิก',
    background: isDark ? '#161B22' : '#FFFFFF',
    color: isDark ? '#F9FAFB' : '#1F2937',
    preConfirm: (value) => {
      if (!value || value.trim().length !== 5 || isNaN(value.trim())) {
        Swal.showValidationMessage(lang === 'en' ? 'Please enter a 5-digit number' : 'กรุณากรอกตัวเลข 5 หลัก');
      }
      return value.trim();
    }
  });

  if (!code) return;

  // Show a loading alert
  Swal.fire({
    title: lang === 'en' ? 'Downloading Data...' : 'กำลังดาวน์โหลดข้อมูล...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
    background: isDark ? '#161B22' : '#FFFFFF',
    color: isDark ? '#F9FAFB' : '#1F2937',
  });

  try {
    const res = await fetch(`https://ntfy.sh/fintrack-cloud-sync-${code}/json?poll=1`);
    if (!res.ok) throw new Error();

    const text = await res.text();
    const lines = text.trim().split('\n');
    let base64Text = null;
    let attachmentUrl = null;

    for (const line of lines) {
      if (!line) continue;
      const obj = JSON.parse(line);
      if (obj.event === 'message') {
        if (obj.attachment && obj.attachment.url) {
          attachmentUrl = obj.attachment.url;
        } else if (obj.message) {
          base64Text = obj.message;
        }
      }
    }

    if (attachmentUrl) {
      const fileRes = await fetch(attachmentUrl);
      if (!fileRes.ok) {
        throw new Error(lang === 'en' ? 'Failed to download attachment file.' : 'ไม่สามารถดาวน์โหลดไฟล์แนบได้');
      }
      base64Text = await fileRes.text();
    }

    if (!base64Text) {
      throw new Error(lang === 'en' ? 'No backup found for this code.' : 'ไม่พบข้อมูลสำรองสำหรับรหัสนี้ หรือรหัสหมดอายุแล้ว');
    }

    const cleanedBase64 = base64Text.trim().replace(/\s/g, '');
    const encrypted = atob(cleanedBase64);
    const decrypted = xorCipher(encrypted, code);
    const decodedJson = decodeURIComponent(escape(decrypted));
    let payload = JSON.parse(decodedJson);

    // If compact format, inflate
    if (payload && payload.ft === 1) {
      payload = inflateFromCompact(payload);
    }

    if (!payload._fintrack || !payload.data) {
      throw new Error(lang === 'en' ? 'Invalid backup data format.' : 'ข้อมูลสำรองมีรูปแบบไม่ถูกต้อง');
    }

    // Close loading and show Merge/Replace Swal
    const result = await Swal.fire({
      title: lang === 'en' ? 'Import Mode' : 'โหมดนำเข้า',
      html: `
        <p style="font-size:13px; margin-bottom:16px; color: ${isDark ? '#9CA3AF' : '#6B7280'}">
          ${lang === 'en'
            ? `<strong>Backup Data Found</strong><br>Exported: ${new Date(payload.exportedAt).toLocaleString()}<br>${payload.data.transactions?.length ?? 0} transactions · ${payload.data.recurringRules?.length ?? 0} recurring rules`
            : `<strong>พบข้อมูลสำรอง</strong><br>ส่งออกเมื่อ: ${new Date(payload.exportedAt).toLocaleString('th-TH')}<br>${payload.data.transactions?.length ?? 0} รายการ · ${payload.data.recurringRules?.length ?? 0} รายการประจำ`
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
    console.error('Cloud import error:', err);
    alerts.error(
      lang === 'en' ? 'Download Failed' : 'ดาวน์โหลดข้อมูลไม่สำเร็จ',
      err.message || (lang === 'en' ? 'Could not retrieve data. Please check the code.' : 'ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบรหัสเชื่อมโยงอีกครั้ง')
    );
  }
}
