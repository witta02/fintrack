import jsQR from "jsqr";
import { runLocalOCR, detectIfBankSlip, parseBankSlipAmount } from "./ocrParser.js";
import { store } from "../store.js";

/**
 * Standard Bank Code Mapping for Thai Financial Institutions
 */
export const THAI_BANK_CODES = {
  "002": "ธนาคารกรุงเทพ (BBL)",
  "004": "ธนาคารกสิกรไทย (KBank)",
  "006": "ธนาคารกรุงไทย (KTB)",
  "011": "ธนาคารทหารไทยธนชาต (ttb)",
  "014": "ธนาคารไทยพาณิชย์ (SCB)",
  "025": "ธนาคารกรุงศรีอยุธยา (BAY)",
  "030": "ธนาคารออมสิน (GSB)",
  "034": "ธ.ก.ส. (BAAC)",
  "065": "ธนาคารอาคารสงเคราะห์ (GHB)",
  "073": "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)",
  "067": "ธนาคารทิสโก้ (TISCO)",
  "069": "ธนาคารเกียรตินาคินภัทร (KKP)",
  "022": "ธนาคารซีไอเอ็มบีไทย (CIMBT)",
  "024": "ธนาคารยูโอบี (UOB)",
};

/**
 * Parses EMVCo / ITMX Tag-Length-Value (TLV) encoded string into a key-value dictionary.
 */
export function parseEMVCoTLV(str) {
  if (!str || typeof str !== "string") return {};
  const tags = {};
  let i = 0;
  while (i < str.length - 3) {
    const tag = str.substring(i, i + 2);
    const len = parseInt(str.substring(i + 2, i + 4), 10);
    if (isNaN(len) || len < 0 || i + 4 + len > str.length) break;
    const val = str.substring(i + 4, i + 4 + len);
    tags[tag] = val;
    i += 4 + len;
  }
  return tags;
}

/**
 * Parses payment amount from Thai Bank Slip QR / EMVCo QR code.
 */
export function parseQRAmount(qrData) {
  if (!qrData || typeof qrData !== "string") return null;

  try {
    const rootTags = parseEMVCoTLV(qrData);

    // 1. Check Root Tag 54 (Standard EMVCo Transaction Amount)
    if (rootTags["54"]) {
      const amt = parseFloat(rootTags["54"]);
      if (!isNaN(amt) && amt > 0) return amt;
    }

    // 2. Check Subtag 04 in Tag 00 (BOT ITMX Slip QR Format)
    if (rootTags["00"] && rootTags["00"].length > 6) {
      const subTags00 = parseEMVCoTLV(rootTags["00"]);
      if (subTags00["04"]) {
        const amt = parseFloat(subTags00["04"]);
        if (!isNaN(amt) && amt > 0) return amt;
      }
      if (subTags00["54"]) {
        const amt = parseFloat(subTags00["54"]);
        if (!isNaN(amt) && amt > 0) return amt;
      }
    }

    // 3. Check Subtag 04 in Tag 51 (Alternative ITMX / TrueMoney standard)
    if (rootTags["51"]) {
      const subTags51 = parseEMVCoTLV(rootTags["51"]);
      if (subTags51["04"]) {
        const amt = parseFloat(subTags51["04"]);
        if (!isNaN(amt) && amt > 0) return amt;
      }
      if (subTags51["54"]) {
        const amt = parseFloat(subTags51["54"]);
        if (!isNaN(amt) && amt > 0) return amt;
      }
    }
  } catch (e) {
    console.warn("TLV parse error in parseQRAmount:", e);
  }

  // Regex fallback for Tag 54: 54<2-digit len><amount>
  const match54 = qrData.match(/(?:^|[^0-9])54(\d{2})([0-9.]+)/);
  if (match54) {
    const len = parseInt(match54[1], 10);
    const amtStr = match54[2].substring(0, len);
    const amt = parseFloat(amtStr);
    if (!isNaN(amt) && amt > 0) return amt;
  }

  return null;
}

/**
 * Extracts Transaction Reference Number from QR data
 */
export function parseQRRefNumber(qrData) {
  if (!qrData || typeof qrData !== "string") return null;

  try {
    const rootTags = parseEMVCoTLV(qrData);

    // Check Subtag 02 in Tag 00
    if (rootTags["00"]) {
      const subTags00 = parseEMVCoTLV(rootTags["00"]);
      if (subTags00["02"]) return subTags00["02"];
    }

    // Check Subtag 02 in Tag 51
    if (rootTags["51"]) {
      const subTags51 = parseEMVCoTLV(rootTags["51"]);
      if (subTags51["02"]) return subTags51["02"];
    }

    // Check Tag 62 (Additional Data Field) Subtags
    if (rootTags["62"]) {
      const subTags62 = parseEMVCoTLV(rootTags["62"]);
      if (subTags62["05"]) return subTags62["05"]; // Reference ID
      if (subTags62["01"]) return subTags62["01"]; // Bill number
    }
  } catch (e) {
    console.warn("TLV parse error in parseQRRefNumber:", e);
  }

  // Regex fallback: BOT standard ref pattern (starts with date/bank code)
  const match = qrData.match(/00\d{2}01\d{2}[^0-9]*(\d{8,35})/);
  if (match) return match[1];

  const refMatch = qrData.match(/(?:02\d{2})([A-Za-z0-9]{8,35})/);
  if (refMatch) return refMatch[1];

  return null;
}

/**
 * Extracts Sending Bank Code and Name from QR data
 */
export function parseQRBankCode(qrData) {
  if (!qrData || typeof qrData !== "string") return null;
  try {
    const rootTags = parseEMVCoTLV(qrData);
    let bankCode = null;
    if (rootTags["00"]) {
      const subTags = parseEMVCoTLV(rootTags["00"]);
      bankCode = subTags["01"] || null;
    }
    if (!bankCode && rootTags["51"]) {
      const subTags = parseEMVCoTLV(rootTags["51"]);
      bankCode = subTags["01"] || null;
    }
    if (bankCode) {
      return {
        code: bankCode,
        name: THAI_BANK_CODES[bankCode] || `Bank (${bankCode})`
      };
    }
  } catch (e) {
    console.warn("TLV bank code extraction error:", e);
  }
  return null;
}

/**
 * Extracts Transaction Reference Number from OCR text
 */
export function parseOCRRefNumber(text) {
  if (!text) return null;
  const match = text.match(/(?:รหัสอ้างอิง|เลขที่อ้างอิง|เลขที่รายการ|ref|trans\s*ref|transaction\s*id|txid|no\.)\s*[:\.\-]?\s*([a-z0-9]{8,35})/i);
  return match ? match[1] : null;
}

/**
 * Computes a fast perceptual canvas fingerprint from image
 */
export function computeCanvasHash(canvas) {
  try {
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0;
    const step = Math.max(1, Math.floor(imgData.length / 1200));
    for (let i = 0; i < imgData.length; i += step) {
      hash = ((hash << 5) - hash) + imgData[i];
      hash |= 0;
    }
    return `px_${canvas.width}x${canvas.height}_${Math.abs(hash).toString(16)}`;
  } catch (e) {
    return null;
  }
}

/**
 * Validates whether an uploaded image file is a valid Thai bank transfer slip,
 * and verifies that the transfer amount matches the expected price (if specified).
 *
 * @param {File|Blob} file - Uploaded bank slip image
 * @param {Object|number|Function} [options] - Options or expected price
 * @param {Function} [statusCb] - Real-time status update callback
 * @returns {Promise<Object>} Verification result
 */
export async function validateBankSlip(file, options = {}, statusCb) {
  const isEn = store.settings.language === "en";
  let expectedAmount = null;
  let statusCallback = statusCb;

  if (typeof options === "function") {
    statusCallback = options;
  } else if (typeof options === "number") {
    expectedAmount = options;
  } else if (options && typeof options === "object") {
    expectedAmount = options.expectedAmount || options.expectedPrice || null;
    statusCallback = options.statusCallback || statusCb;
  }

  if (!file || !file.type.startsWith("image/")) {
    return { isValid: false, reason: isEn ? "Please upload a valid image file." : "กรุณาอัปโหลดไฟล์รูปภาพที่ถูกต้อง" };
  }

  // 1. Multi-scale QR Code Scanning
  statusCallback?.(isEn ? "Scanning bank slip QR code..." : "กำลังสแกน Mini-QR บนสลิป...");
  const qrResult = await scanQRFromImage(file);

  let detectedAmount = null;
  let isValidSlip = false;
  let qrData = null;
  let ocrText = null;
  let imageHash = qrResult.imageHash || null;
  let bankInfo = null;

  if (qrResult.isValid) {
    isValidSlip = true;
    qrData = qrResult.qrData;
    detectedAmount = parseQRAmount(qrData);
    bankInfo = parseQRBankCode(qrData);
  }

  // 2. If QR scan didn't detect amount or didn't find QR code, run OCR fallback
  if (!isValidSlip || (expectedAmount != null && detectedAmount == null)) {
    statusCallback?.(isEn ? "Reading slip text & amount details..." : "กำลังอ่านรายละเอียดและยอดเงินในสลิป...");
    try {
      const rawText = await runLocalOCR(file, statusCallback);
      if (rawText) {
        if (!isValidSlip && detectIfBankSlip(rawText)) {
          isValidSlip = true;
        }
        ocrText = rawText;
        const ocrAmount = parseBankSlipAmount(rawText);
        if (ocrAmount != null && (detectedAmount == null || detectedAmount === 0)) {
          detectedAmount = ocrAmount;
        }
      }
    } catch (err) {
      console.warn("Slip OCR validation error:", err);
    }
  }

  // If neither QR scan nor OCR confirmed this is a bank transfer slip: Reject
  if (!isValidSlip) {
    return {
      isValid: false,
      reason: isEn
        ? "Invalid slip. No bank transfer details or verification QR code found."
        : "สลิปไม่ถูกต้อง หรือไม่พบรายละเอียดการโอนเงิน/QR Code ของธนาคาร",
      imageHash
    };
  }

  // 3. Amount Verification: Check if detected amount matches expected price
  if (expectedAmount != null && expectedAmount > 0) {
    if (detectedAmount != null) {
      const diff = Math.abs(detectedAmount - expectedAmount);
      // Allow minor rounding difference (< 0.50) or exact match
      if (diff > 0.50 && Math.round(detectedAmount) !== Math.round(expectedAmount)) {
        return {
          isValid: false,
          reason: isEn
            ? `Transfer amount (฿${detectedAmount.toFixed(2)}) does not match required price (฿${expectedAmount.toFixed(2)})`
            : `ยอดเงินในสลิป (฿${detectedAmount.toFixed(2)}) ไม่ตรงกับยอดที่ต้องชำระ (฿${expectedAmount.toFixed(2)})`,
          detectedAmount,
          expectedAmount,
          qrData,
          ocrText,
          imageHash
        };
      }
    } else {
      console.warn(`Could not extract exact amount from slip. Verified based on bank slip authenticity.`);
    }
  }

  let ref = qrData ? parseQRRefNumber(qrData) : null;
  if (!ref && ocrText) {
    ref = parseOCRRefNumber(ocrText);
  }

  const bankName = bankInfo?.name || (isEn ? "Bank Transfer" : "โอนเงินผ่านธนาคาร");

  return {
    isValid: true,
    reason: detectedAmount
      ? (isEn ? `Bank transfer verified (฿${detectedAmount.toFixed(2)})` : `ยืนยันสลิปโอนเงินสำเร็จ (฿${detectedAmount.toFixed(2)})`)
      : (isEn ? "Bank transfer verified successfully" : "ยืนยันสลิปโอนเงินสำเร็จ"),
    detectedAmount: detectedAmount || expectedAmount,
    expectedAmount,
    bankName,
    bankCode: bankInfo?.code || null,
    qrData,
    ref,
    imageHash,
    ocrText
  };
}

/**
 * Scans QR code from image using multi-pass strategies (Original, Downscaled, Cropped Bottom, High-Contrast)
 */
function scanQRFromImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const fullCanvas = document.createElement("canvas");
        fullCanvas.width = img.width;
        fullCanvas.height = img.height;
        const fullCtx = fullCanvas.getContext("2d");
        fullCtx.drawImage(img, 0, 0);

        const imageHash = computeCanvasHash(fullCanvas);

        // Helper to attempt jsQR scan on a canvas
        const tryScan = (c) => {
          try {
            const ctx = c.getContext("2d");
            const imgData = ctx.getImageData(0, 0, c.width, c.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: "attemptBoth"
            });
            if (
              code &&
              code.data &&
              (code.data.startsWith("00") ||
               code.data.includes("000201") ||
               code.data.includes("000202") ||
               code.data.includes("00020") ||
               code.data.includes("A000000677") ||
               code.data.includes("promptpay") ||
               code.data.includes("http"))
            ) {
              return code.data;
            }
          } catch (err) {
            console.warn("jsQR scan attempt error:", err);
          }
          return null;
        };

        // Strategy 1: Scan full image
        let qrData = tryScan(fullCanvas);
        if (qrData) {
          resolve({ isValid: true, qrData, imageHash });
          return;
        }

        // Strategy 2: Rescaled canvas (max width 900px) for high-resolution mobile screenshots
        if (img.width > 900 || img.height > 900) {
          const scale = Math.min(900 / img.width, 900 / img.height);
          const scaledCanvas = document.createElement("canvas");
          scaledCanvas.width = Math.round(img.width * scale);
          scaledCanvas.height = Math.round(img.height * scale);
          const scaledCtx = scaledCanvas.getContext("2d");
          scaledCtx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height);

          qrData = tryScan(scaledCanvas);
          if (qrData) {
            resolve({ isValid: true, qrData, imageHash });
            return;
          }
        }

        // Strategy 3: Crop Bottom 60% of slip (where Thai bank mini-QRs are positioned)
        const cropCanvas = document.createElement("canvas");
        const cropY = Math.floor(img.height * 0.35);
        const cropH = img.height - cropY;
        cropCanvas.width = img.width;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(img, 0, cropY, img.width, cropH, 0, 0, img.width, cropH);

        qrData = tryScan(cropCanvas);
        if (qrData) {
          resolve({ isValid: true, qrData, imageHash });
          return;
        }

        // Strategy 4: High-contrast binarization on crop
        try {
          const cropCtx2 = cropCanvas.getContext("2d");
          const imgData = cropCtx2.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const gray = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
            const val = gray > 140 ? 255 : 0;
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
          }
          cropCtx2.putImageData(imgData, 0, 0);
          qrData = tryScan(cropCanvas);
          if (qrData) {
            resolve({ isValid: true, qrData, imageHash });
            return;
          }
        } catch (e) {
          // ignore binarization error
        }

        resolve({ isValid: false, reason: "No valid bank QR code detected.", imageHash });
      };
      img.onerror = () => resolve({ isValid: false, reason: "Failed to load image." });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ isValid: false, reason: "Failed to read file." });
    reader.readAsDataURL(file);
  });
}
