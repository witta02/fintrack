import { store } from '../store.js';

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
  const lines = text.split('\n');
  let detectedPayee = "";
  const detectedItems = [];
  let detectedTax = 0.0;
  let detectedTip = 0.0;
  let detectedTotal = 0.0;

  // 1. Detect Payee (usually first few lines that contain store names and not just numbers/dates)
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
        break;
      }
    }
  }

  // 2. Parse lines to look for items, tax, tip, total
  for (let line of lines) {
    line = line.trim();
    if (line.length < 4) continue;

    const lowerLine = line.toLowerCase();

    // Check if line represents Totals (Tax, Tip, Total)
    const isTotalLine = lowerLine.includes("total") || lowerLine.includes("subtotal") || lowerLine.includes("net") ||
      lowerLine.includes("รวม") || lowerLine.includes("ยอดรวม") || lowerLine.includes("รวมเงิน") ||
      lowerLine.includes("ภาษี") || lowerLine.includes("tax") || lowerLine.includes("vat") ||
      lowerLine.includes("tip") || lowerLine.includes("service charge") || lowerLine.includes("ค่าบริการ") ||
      lowerLine.includes("ทิป");

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

    // Try to extract an item
    // Pattern: Name followed by a price at the end of the line
    const priceMatch = line.match(/(\d+[\.,]\d{2})\s*$/) || line.match(/(\d+)\s*$/);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(',', '.');
      const price = parseFloat(priceStr);

      if (price > 0 && price < 100000) { // filter out ridiculously large numbers like phone numbers or serials
        let name = line.substring(0, priceMatch.index).trim();
        
        // Clean up symbols often misread by OCR
        name = name.replace(/[\.\-\*_#:@]/g, '').trim();

        // Parse quantity if present (e.g. "2x Latte", "Latte x3", "Latte 2 120.00")
        let qty = 1;
        const qtyMatchBegin = name.match(/^(\d+)\s*[xX*]\s+/);
        const qtyMatchEnd = name.match(/\s+(\d+)\s*[xX*]\s*$/);
        const qtyMatchXBegin = name.match(/^[xX]\s*(\d+)\s+/);

        if (qtyMatchBegin) {
          qty = parseInt(qtyMatchBegin[1]) || 1;
          name = name.substring(qtyMatchBegin[0].length).trim();
        } else if (qtyMatchEnd) {
          qty = parseInt(qtyMatchEnd[1]) || 1;
          name = name.substring(0, qtyMatchEnd.index).trim();
        } else if (qtyMatchXBegin) {
          qty = parseInt(qtyMatchXBegin[1]) || 1;
          name = name.substring(qtyMatchXBegin[0].length).trim();
        }

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
    detectedTotal = itemsSum + detectedTax + detectedTip;
  }

  return {
    payee: detectedPayee || "ร้านค้า",
    items: detectedItems,
    tax: detectedTax,
    tip: detectedTip,
    total: detectedTotal
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
  const lines = text.split('\n');
  
  // Strategy 1: Keyword Proximity
  // Check for amount labels on a line and look for the number on that line or next line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check for amount keywords (matching both standard and decomposed SARAM AM) and exclude fees
    const isAmountLabel = (/[จจํ][ําา]นวน|ยอด|amount|total|sum/i.test(line)) && !(/ธรรม|fee/i.test(line));
    
    if (isAmountLabel) {
      // Find a decimal number in this line
      let match = line.match(/(\d+[\.,]\d{2})/);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (val > 0) return val;
      }
      
      // Check next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        match = nextLine.match(/(\d+[\.,]\d{2})/);
        if (match) {
          const val = parseFloat(match[1].replace(',', '.'));
          if (val > 0) return val;
        }
      }
    }
  }

  // Strategy 2: Decimal Extraction
  // Find all decimal numbers and pick the first positive one that is not 0.00
  const decimals = [];
  for (const line of lines) {
    if (/ธรรม|fee/i.test(line)) continue;
    
    const matches = line.match(/(\d+[\.,]\d{2})/g);
    if (matches) {
      for (const m of matches) {
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

  // Strategy 3: Currency Symbol Proximity
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (/บาท|thb|฿/i.test(lowerLine) && !/ธรรม|fee/i.test(lowerLine)) {
      const match = line.match(/(\d+[\.,]\d{2})/) || line.match(/(\d+)/);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.')) || 0.0;
        if (val > 0) return val;
      }
    }
  }

  return null;
}
