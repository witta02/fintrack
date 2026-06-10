import { store } from '../store.js';

// Preprocesses text to normalize spaces incorrectly inserted between Thai characters by OCR diacritics/segments
export function normalizeThaiText(text) {
  if (!text) return "";
  return text.replace(/(?<=[\u0E00-\u0E7F])\s+(?=[\u0E00-\u0E7F])/g, '');
}

// Dynamic script loader for Tesseract.js
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Regex-based receipt parser
export function parseReceiptText(text) {
  text = normalizeThaiText(text);
  const lines = text.split('\n');
  let detectedPayee = "";
  const detectedItems = [];
  let detectedTax = 0.0;
  let detectedTip = 0.0;
  let detectedTotal = 0.0;

  // Metadata fields
  let detectedAddress = "";
  let detectedDate = "";
  let detectedServer = "";
  let detectedTable = "";
  let detectedCheck = "";
  let detectedTaxIncluded = false;

  // Helper to normalize payee names
  const normalizePayeeName = (name) => {
    if (!name) return "";
    const clean = name.toLowerCase().replace(/[^\w\s\u0E00-\u0E7F]/g, '');
    if (clean.includes("mcthai") || clean.includes("ncthat") || clean.includes("mcdonald")) {
      return "McDonald's";
    }
    if (clean.includes("711") || clean.includes("seven") || clean.includes("cpall") || clean.includes("cp all")) {
      return "7-Eleven";
    }
    if (clean.includes("starbuck")) {
      return "Starbucks";
    }
    if (clean.includes("cafe amazon") || clean.includes("amazon cafe") || clean.includes("อเมซอน")) {
      return "Café Amazon";
    }
    if (clean.includes("grab")) {
      return "Grab";
    }
    if (clean.includes("swensen")) {
      return "Swensen's";
    }
    if (clean.includes("kfc")) {
      return "KFC";
    }
    return name;
  };

  // 1. Detect Payee (usually first few lines that contain store names and not just numbers/dates)
  let payeeLineIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    if (
      line.length > 3 &&
      !/\d{4,}/.test(line) && // avoid dates/phone numbers
      !line.toLowerCase().includes("receipt") &&
      !line.toLowerCase().includes("invoice") &&
      !line.toLowerCase().includes("tax") &&
      !line.toLowerCase().includes("welcome")
    ) {
      detectedPayee = line.replace(/[^\w\s\u0E00-\u0E7F]/g, '').trim(); // clean special chars
      if (detectedPayee.length > 2) {
        payeeLineIndex = i;
        break;
      }
    }
  }

  const rawPayee = detectedPayee;
  detectedPayee = normalizePayeeName(detectedPayee);

  // Detect Tax Included
  if (/vat included|tax included|รวมภาษี|รวม vat|incl\.?\s*tax/i.test(text)) {
    detectedTaxIncluded = true;
  }

  // Extract metadata fields
  const dateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/;
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (line.length < 4) continue;

    // Address/Tel detection
    if (!detectedAddress && /tel\b|phone\b|mobile\b|branch\b|สาขา\b|ถนน\b|ซอย\b|ชั้น\b|road\b|street\b|st\b|rd\b|ave\b|avenue\b|bldg\b|building\b|town\b|city\b|prov\b|district\b|ตำบล\b|อำเภอ\b|จังหวัด\b/i.test(line)) {
      if (!line.toLowerCase().includes("payee") && !line.toLowerCase().includes("total")) {
        detectedAddress = line.replace(/[#_*|]/g, '').trim();
      }
    }

    // Date detection
    if (!detectedDate) {
      const dMatch = line.match(dateRegex);
      if (dMatch) {
        detectedDate = dMatch[0];
        const tMatch = line.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
        if (tMatch) {
          detectedDate += " " + tMatch[0];
        }
      }
    }

    // Server detection
    if (!detectedServer && (/\b(?:server|cashier|crew|staff|waiter|cashier\d*|พนักงาน|ผู้ขาย|แคชเชียร์)\b/i.test(line) || line.toLowerCase().includes("crew id"))) {
      const serverMatch = line.match(/(?:server|cashier|crew|staff|waiter|พนักงาน|ผู้ขาย|แคชเชียร์)(?:\s*id)?\s*[:\-\d]*\s+(.+)/i);
      if (serverMatch) {
        detectedServer = serverMatch[1].replace(/[#_*|]/g, '').replace(/^[^\w\u0E00-\u0E7F]+/g, '').trim();
      } else {
        detectedServer = line.replace(/[#_*|]/g, '').replace(/^[^\w\u0E00-\u0E7F]+/g, '').trim();
      }
    }

    // Table detection
    if (!detectedTable && /\b(?:table|tbl|โต๊ะ)\b/i.test(line)) {
      const match = line.match(/(?:table|tbl|โต๊ะ)\s*[:\-\s]*\s*(\w+)/i);
      if (match) {
        detectedTable = match[1].trim();
      }
    }

    // Check / Order / Inv detection
    if (!detectedCheck && /\b(?:check|chk|order|ord|inv|bill|receipt)\b|เลขที่|ใบเสร็จ|อ้างอิง/i.test(line)) {
      const match = line.match(/(?:\b(?:check|chk|order|ord|inv|bill|receipt)\b|เลขที่|ใบเสร็จ|อ้างอิง)\s*#?[:\-\s]*\s*([A-Z0-9\-\/]+)/i);
      if (match) {
        if (match[1].length > 2 && !/^\d{2}[\/\-]\d{2}/.test(match[1])) {
          detectedCheck = match[1].trim();
        }
      }
    }
  }

  // 2. Parse lines to look for items, tax, tip, total
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx].trim();
    if (line.length < 4) continue;

    // Skip the detected payee line index
    if (idx === payeeLineIndex) continue;

    const lowerLine = line.toLowerCase();

    // Check if line represents Totals (Tax, Tip, Total, Discount, Rounding)
    const isTotalLine = lowerLine.includes("total") || lowerLine.includes("subtotal") || lowerLine.includes("net") ||
      lowerLine.includes("รวม") || lowerLine.includes("ยอดรวม") || lowerLine.includes("รวมเงิน") ||
      lowerLine.includes("ภาษี") || lowerLine.includes("tax") || lowerLine.includes("vat") ||
      lowerLine.includes("tip") || lowerLine.includes("service charge") || lowerLine.includes("ค่าบริการ") ||
      lowerLine.includes("ทิป") || lowerLine.includes("discount") || lowerLine.includes("ส่วนลด") ||
      lowerLine.includes("rounding") || lowerLine.includes("adjustment");

    if (isTotalLine) {
      // Find all decimal numbers in the line
      const matches = line.match(/(\d+[\.,]\d{1,2})/g) || line.match(/(\d+)/g);
      if (matches && matches.length > 0) {
        const value = parseFloat(matches[matches.length - 1].replace(',', '.')) || 0.0;

        if (lowerLine.includes("tax") || lowerLine.includes("vat") || lowerLine.includes("ภาษี")) {
          detectedTax = value;
        } else if (lowerLine.includes("tip") || lowerLine.includes("service charge") || lowerLine.includes("ค่าบริการ") || lowerLine.includes("ทิป")) {
          detectedTip = value;
        } else if (lowerLine.includes("total") || lowerLine.includes("ยอดรวม") || lowerLine.includes("รวมเงิน") || lowerLine.includes("สุทธิ")) {
          // Keep the highest total found
          if (value > detectedTotal) {
            detectedTotal = value;
          }
        }
      }
      continue;
    }

    // Skip metadata lines (using word boundary for English keys to prevent false positives)
    const isMetadataLine = /\b(?:tel|phone|mobile|date|time|ref|check|table|id|no|card|cash|change|visa|mastercard|credit|debit|payment|coupon|serial|type|crew|cashier|staff|waiter|member|loyalty|rounding|adjustment)\b|grabpay|shopeepay|truemoney|promptpay|\b(?:grab|lineman|foodpanda|shopeefood|delivery)\b|#|xxx|เลขที่|วันที่|เวลา|อ้างอิง|เบอร์|โทร|บัญชี|account|โอนเงิน|สำเร็จ|ไปยัง|จาก|พร้อมเพย์|ธนาคาร|สาขา|คูปอง/i.test(line);
    if (isMetadataLine) continue;

    // Skip payee name line to prevent matching the payee line itself as an item (using helper)
    const isPayeeLine = (l, raw, norm) => {
      if (!l) return false;
      const cleanLine = l.toLowerCase().replace(/[^\w\u0E00-\u0E7F]/g, '').replace(/0/g, 'o');
      const cleanRaw = (raw || "").toLowerCase().replace(/[^\w\u0E00-\u0E7F]/g, '').replace(/0/g, 'o');
      const cleanNorm = (norm || "").toLowerCase().replace(/[^\w\u0E00-\u0E7F]/g, '').replace(/0/g, 'o');
      
      if (cleanRaw && (cleanLine === cleanRaw || cleanLine.includes(cleanRaw) || cleanRaw.includes(cleanLine))) {
        return true;
      }
      if (cleanNorm && (cleanLine === cleanNorm || cleanLine.includes(cleanNorm) || cleanNorm.includes(cleanLine))) {
        return true;
      }
      return false;
    };

    if (isPayeeLine(line, rawPayee, detectedPayee)) {
      continue;
    }

    // Clean trailing noise like B., THB, Baht, บาท, *, |, or trailing spaces/periods to help match price
    let cleanedLine = line;
    cleanedLine = cleanedLine.replace(/[\s\.\*\|_#,:!\-\/\\=+@]+$/, "");
    cleanedLine = cleanedLine.replace(/\s*(?:บาท|baht|thb|฿|b|B)\.?\s*$/i, "");
    cleanedLine = cleanedLine.replace(/[\s\.\*\|_#,:!\-\/\\=+@]+$/, "");

    // Normalize common OCR typos in prices before matching
    let normalizedLine = cleanedLine;
    normalizedLine = normalizedLine.replace(/[\.,\s]([oO0])([oO0])\s*$/g, '.00');
    if (/(\d+)\s+(\d{2})\s*$/.test(normalizedLine)) {
      normalizedLine = normalizedLine.replace(/(\d+)\s+(\d{2})\s*$/, '$1.$2');
    }

    // Try to extract an item price
    // Pattern: Name followed by a decimal price (\d+.\d{2}) at the end of the line.
    // If not found, look for a small integer (less than 5 digits) not preceded by time/date punctuation, and require it to be >= 10 to filter out indexes/quantities.
    let priceMatch = normalizedLine.match(/(\d+[\.,]\d{2})\s*$/);
    if (!priceMatch) {
      const intMatch = normalizedLine.match(/\b(\d+)\s*$/);
      if (intMatch && intMatch[1].length < 5) {
        const val = parseInt(intMatch[1]);
        if (val >= 10) { // Filter out small integers like table index or single qty numbers
          const beforeNum = normalizedLine.substring(0, intMatch.index).trim();
          // Check it's not part of a date/time (like 12:27 or 09/06)
          if (!/[:\-\/]$/.test(beforeNum)) {
            priceMatch = intMatch;
          }
        }
      }
    }

    if (priceMatch) {
      const priceStr = priceMatch[1].replace(',', '.');
      const price = parseFloat(priceStr);

      if (price > 0 && price < 100000) {
        let name = normalizedLine.substring(0, priceMatch.index).trim();
        
        // Clean up symbols often misread by OCR at the end of the name
        name = name.replace(/[\.\-\*_#:@|\\/]+$/g, '').trim();

        // Parse quantity if present (e.g. "2x Latte", "Latte x3", "Latte 2 120.00")
        let qty = 1;
        const qtyMatchBegin = name.match(/^(\d+)\s*[xX*]?\s+/);
        const qtyMatchEnd = name.match(/\s+[xX*]?\s*(\d+)$/);
        const qtyMatchXEnd = name.match(/\s+(\d+)\s*[xX*]\s*$/);
        const qtyMatchPlainEnd = name.match(/\s+(\d+)$/);

        if (qtyMatchBegin && parseInt(qtyMatchBegin[1]) < 100) {
          qty = parseInt(qtyMatchBegin[1]) || 1;
          name = name.substring(qtyMatchBegin[0].length).trim();
        } else if (qtyMatchEnd && parseInt(qtyMatchEnd[1]) < 100) {
          qty = parseInt(qtyMatchEnd[1]) || 1;
          name = name.substring(0, qtyMatchEnd.index).trim();
        } else if (qtyMatchXEnd && parseInt(qtyMatchXEnd[1]) < 100) {
          qty = parseInt(qtyMatchXEnd[1]) || 1;
          name = name.substring(0, qtyMatchXEnd.index).trim();
        } else if (qtyMatchPlainEnd && parseInt(qtyMatchPlainEnd[1]) < 100) {
          qty = parseInt(qtyMatchPlainEnd[1]) || 1;
          name = name.substring(0, qtyMatchPlainEnd.index).trim();
        }

        // Clean up leading/trailing symbols in name
        name = name.replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, '').trim();

        if (name.length > 2) {
          detectedItems.push({
            id: Math.random().toString(36).substring(2, 11),
            name: name,
            price: price / qty, // unit price
            qty: qty
          });
        }
      }
    }
  }

  // Calculate sum of items
  const itemsSum = detectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // If detectedTotal is 0 or less than the items sum, set it to items sum + tax + tip
  if (detectedTotal <= 0 || detectedTotal < itemsSum) {
    detectedTotal = itemsSum + (detectedTaxIncluded ? 0.0 : (detectedTax + detectedTip));
  }

  return {
    payee: detectedPayee || "ร้านค้า",
    address: detectedAddress,
    date: detectedDate,
    server: detectedServer,
    table: detectedTable,
    check: detectedCheck,
    items: detectedItems,
    tax: detectedTax,
    tip: detectedTip,
    total: detectedTotal,
    taxIncluded: detectedTaxIncluded
  };
}

// Maps keywords to standard fintrack categories
export function guessCategory(text, payee) {
  const combined = (text + " " + payee).toLowerCase();
  
  const rules = [
    { cat: 'Food', keywords: ['cafe', 'coffee', 'food', 'restaurant', 'steak', 'sushi', 'pizza', 'burger', 'kitchen', 'bakery', 'ร้านอาหาร', 'กาแฟ', 'อร่อย', 'ชา', 'ขนม', 'เมนู', 'หมูกระทะ', 'ชาบู'] },
    { cat: 'Transport', keywords: ['taxi', 'gas', 'petrol', 'fuel', 'bts', 'mrt', 'grab', 'bolt', 'ride', 'น้ำมัน', 'รถไฟฟ้า', 'ทางด่วน', 'ปั๊มน้ำมัน', 'caltex', 'ptt', 'shell', 'esso'] },
    { cat: 'Shopping', keywords: ['shop', 'store', 'mall', 'supermarket', 'outlet', 'clothes', 'shoes', 'index', 'hm', 'zara', '7-11', 'tops', 'lotus', 'bigc', 'ซูเปอร์', 'ห้าง', 'บิ๊กซี', 'โลตัส', 'เซเว่น'] },
    { cat: 'Salary', keywords: ['salary', 'income', 'payroll', 'bonus', 'เงินเดือน', 'รายได้', 'ปันผล'] },
    { cat: 'Bills', keywords: ['bill', 'electric', 'water', 'net', 'wifi', 'mobile', 'phone', 'rent', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าเน็ต', 'ค่าเช่า', 'บิล', 'ais', 'true', 'dtac'] },
    { cat: 'Entertainment', keywords: ['cinema', 'movie', 'game', 'play', 'show', 'concert', 'netflix', 'โรงหนัง', 'เกม', 'คอนเสิร์ต', 'คาราโอเกะ'] },
    { cat: 'Health', keywords: ['pharmacy', 'drug', 'hospital', 'clinic', 'doctor', 'gym', 'fit', 'ยา', 'โรงพยาบาล', 'คลินิก', 'ยาสีฟัน', 'ฟิตเนส', 'สปา'] }
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => combined.includes(kw))) {
      return rule.cat;
    }
  }

  return 'Other';
}

// Run client-side Tesseract OCR
export async function runLocalOCR(file, progressCallback) {
  if (typeof window.Tesseract === 'undefined') {
    progressCallback?.(store.settings.language === 'en' ? 'Loading OCR engine...' : 'กำลังโหลดระบบสแกนข้อความ...');
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
  }

  progressCallback?.(store.settings.language === 'en' ? 'Scanning receipt details...' : 'กำลังวิเคราะห์รายการบิล...');
  
  const worker = await window.Tesseract.createWorker(store.settings.language === 'en' ? 'eng' : 'eng+tha');
  
  try {
    const result = await worker.recognize(file);
    await worker.terminate();
    return result.data.text;
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}

// Parses bank slip amount from OCR text (Thai e-slip specific)
export function parseBankSlipAmount(text) {
  if (!text) return null;
  text = normalizeThaiText(text);
  const lines = text.split('\n');
  
  // Strategy 1: Look for final payment amount keywords (ชำระ, สุทธิ, net, paid) to avoid subtotal/discount lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (/ชำระ|สุทธิ|net|paid/i.test(line) && !/ธรรม|fee/i.test(line)) {
      let match = line.match(/(\d+[\.,]\d{2})/) || line.match(/\b(\d+)\s*(?:บาท|thb|฿|\s|$)/i);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (val > 0) return val;
      }
      
      // Check next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        match = nextLine.match(/(\d+[\.,]\d{2})/) || nextLine.match(/\b(\d+)\b/);
        if (match) {
          const val = parseFloat(match[1].replace(',', '.'));
          if (val > 0) return val;
        }
      }
    }
  }
  
  // Strategy 2: Keyword Proximity
  // Check for amount labels on a line and look for the number on that line or next line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].toLowerCase();
    
    // Truncate line before fee keywords if it contains both amount and fee details (OCR merging)
    if (line.includes('ธรรม') || line.includes('fee')) {
      if (/[จจํ][ําา]นวน|ยอด|amount|total|sum/i.test(line)) {
        const idx = line.includes('ธรรม') ? line.indexOf('ธรรม') : line.indexOf('fee');
        line = line.substring(0, idx);
      }
    }
    
    // Check for amount keywords (matching both standard and decomposed SARAM AM) and exclude fees
    const isAmountLabel = (/[จจํ][ําา]นวน|ยอด|amount|total|sum/i.test(line)) && !(/ธรรม|fee/i.test(line));
    
    if (isAmountLabel) {
      // Find a decimal number in this line
      let match = line.match(/(\d+[\.,]\d{2})/) || line.match(/\b(\d+)\s*(?:บาท|thb|฿|\s|$)/i);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (val > 0) return val;
      }
      
      // Check next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        match = nextLine.match(/(\d+[\.,]\d{2})/) || nextLine.match(/\b(\d+)\b/);
        if (match) {
          const val = parseFloat(match[1].replace(',', '.'));
          if (val > 0) return val;
        }
      }
    }
  }

  // Strategy 3: Decimal Extraction
  // Find all decimal numbers and pick the first positive one that is not 0.00
  const decimals = [];
  for (const line of lines) {
    if (/ธรรม|fee/i.test(line)) continue;
    
    const matches = line.match(/(\d+[\.,]\d{2})/g);
    if (matches) {
      for (const m of matches) {
        // Check if this match is part of a time representation (e.g., "14:20" or "69,14:20")
        const index = line.indexOf(m);
        if (index !== -1) {
          const charAfter = line.charAt(index + m.length);
          const charBefore = index > 0 ? line.charAt(index - 1) : '';
          if (charAfter === ':' || charBefore === ':') {
            continue;
          }
          if (/^\d/.test(line.substring(index + m.length))) {
            continue;
          }
        }
        
        const val = parseFloat(m.replace(',', '.'));
        if (val > 0 && val < 1000000) {
          decimals.push(val);
        }
      }
    }
  }
  if (decimals.length > 0) {
    return decimals[0];
  }

  // Strategy 4: Currency Symbol Proximity
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (/บาท|thb|฿/i.test(lowerLine) && !/ธรรม|fee/i.test(lowerLine)) {
      const match = line.match(/(\d+[\.,]\d{2})/) || line.match(/\b(\d+)\b/);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.')) || 0.0;
        if (val > 0) return val;
      }
    }
  }

  return null;
}

// Detects if the OCR text represents a bank transfer slip or e-wallet transaction
export function detectIfBankSlip(text) {
  if (!text) return false;
  text = normalizeThaiText(text);
  const lowerText = text.toLowerCase();
  
  const keywords = [
    'โอนเงินสำเร็จ', 'รายการสำเร็จ', 'ทำรายการสำเร็จ', 'รหัสอ้างอิง', 'เลขที่อ้างอิง',
    'ค่าธรรมเนียม', 'พร้อมเพย์', 'g-wallet', 'เป๋าตัง', 'krungthai', 'bangkok bank',
    'kbank', 'scb', 'kasikorn', 'ไทยพาณิชย์', 'กสิกร', 'กรุงไทย', 'กรุงเทพ', 'ttb',
    'โอนเงิน', 'ชำระเงิน', 'สิทธิ์คนละครึ่ง', 'สิทธิ์ไทยช่วยไทย'
  ];
  
  let count = 0;
  for (const kw of keywords) {
    if (lowerText.includes(kw)) {
      count++;
    }
  }
  
  return count >= 2;
}

// Extracts receiver's name from bank/e-wallet slips
export function parseBankSlipReceiver(text) {
  if (!text) return "โอนเงินสำเร็จ";
  text = normalizeThaiText(text);
  const lines = text.split('\n');
  
  // Look for lines that indicate receiver
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('ไปยัง') || line.includes('ไปที่') || line.toLowerCase().includes('to:')) {
      // Try to extract from the same line after the keyword first
      let rest = "";
      if (line.includes('ไปยัง')) rest = line.substring(line.indexOf('ไปยัง') + 5).trim();
      else if (line.includes('ไปที่')) rest = line.substring(line.indexOf('ไปที่') + 5).trim();
      else if (line.toLowerCase().includes('to:')) rest = line.substring(line.toLowerCase().indexOf('to:') + 3).trim();
      
      rest = rest.replace(/^[@\s_]+/g, '').replace(/[\d\-*]+/g, '').trim();
      if (rest.length > 2) return rest;

      // Fall back to next line if same line is empty
      if (i + 1 < lines.length) {
        let name = lines[i + 1].trim();
        name = name.replace(/[\d\-*]+/g, '').trim();
        if (name.length > 2) return name;
      }
    }
  }

  // Fallback for Pao Tang or other layouts: search for a shop/name indicator
  for (let i = Math.floor(lines.length / 4); i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('ร้าน') || line.includes('บริษัท') || line.includes('นาย') || line.includes('นาง') || line.includes('น.ส.')) {
      return line.replace(/[^\w\s\u0E00-\u0E7F]/g, '').trim();
    }
  }
  
  return "รายการโอนเงิน";
}
