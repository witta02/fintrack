import jsQR from "jsqr";
import { runLocalOCR, detectIfBankSlip, parseBankSlipAmount } from "./ocrParser.js";
import { store } from "../store.js";

/**
 * Parses payment amount from EMVCo QR code string (Tag 54)
 */
export function parseQRAmount(qrData) {
  if (!qrData || typeof qrData !== "string") return null;
  const tagIndex = qrData.indexOf("54");
  if (tagIndex !== -1 && tagIndex + 4 <= qrData.length) {
    const lenStr = qrData.substring(tagIndex + 2, tagIndex + 4);
    const len = parseInt(lenStr, 10);
    if (!isNaN(len) && len > 0 && tagIndex + 4 + len <= qrData.length) {
      const valStr = qrData.substring(tagIndex + 4, tagIndex + 4 + len);
      const val = parseFloat(valStr);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  const match = qrData.match(/54(\d{2})([0-9.]+)/);
  if (match) {
    const len = parseInt(match[1], 10);
    const amtStr = match[2].substring(0, len);
    const amt = parseFloat(amtStr);
    if (!isNaN(amt) && amt > 0) return amt;
  }
  return null;
}

/**
 * Computes a fast pixel canvas fingerprint from image
 */
export function computeCanvasHash(canvas) {
  try {
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0;
    const step = Math.max(1, Math.floor(imgData.length / 1000));
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
 * Extracts Transaction Reference Number from QR data or OCR text
 */
export function parseQRRefNumber(qrData) {
  if (!qrData || typeof qrData !== "string") return null;
  const match = qrData.match(/00\d{2}01\d{2}[^0-9]*(\d{8,30})/);
  if (match) return match[1];
  const refMatch = qrData.match(/(?:02\d{2})([A-Za-z0-9]{8,30})/);
  if (refMatch) return refMatch[1];
  return null;
}

export function parseOCRRefNumber(text) {
  if (!text) return null;
  const match = text.match(/(?:รหัสอ้างอิง|เลขที่อ้างอิง|ref|trans\s*ref|transaction\s*id|no\.)\s*[:\.]?\s*([a-z0-9]{8,30})/i);
  return match ? match[1] : null;
}

/**
 * Validates whether an uploaded image file is a valid Thai bank transfer slip,
 * and verifies that the transfer amount matches the expected price (if specified).
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
    return { isValid: false, reason: isEn ? "Please upload an image file." : "กรุณาอัปโหลดไฟล์รูปภาพ" };
  }

  // 1. Scan for Bank Slip Mini QR / PromptPay QR code using jsQR
  statusCallback?.(isEn ? "Scanning bank slip..." : "กำลังสแกนสลิปธนาคาร...");
  const qrResult = await scanQRFromImage(file);

  let detectedAmount = null;
  let isValidSlip = false;
  let qrData = null;
  let ocrText = null;
  let imageHash = qrResult.imageHash || null;

  if (qrResult.isValid) {
    isValidSlip = true;
    qrData = qrResult.qrData;
    detectedAmount = parseQRAmount(qrData);
  }

  // 2. If QR scan didn't find valid QR or didn't detect amount, run OCR
  if (!isValidSlip || (expectedAmount != null && detectedAmount == null)) {
    statusCallback?.(isEn ? "Reading slip details..." : "กำลังอ่านรายละเอียดสลิป...");
    try {
      const rawText = await runLocalOCR(file, statusCallback);
      if (rawText) {
        if (!isValidSlip && detectIfBankSlip(rawText)) {
          isValidSlip = true;
          ocrText = rawText;
        }
        const ocrAmount = parseBankSlipAmount(rawText);
        if (ocrAmount != null) {
          detectedAmount = ocrAmount;
        }
      }
    } catch (err) {
      console.warn("Slip OCR validation error:", err);
    }
  }

  // If neither QR scan nor OCR text verified it as a bank slip: Reject
  if (!isValidSlip) {
    return {
      isValid: false,
      reason: isEn
        ? "Invalid slip. No bank transfer details or QR code found."
        : "สลิปไม่ถูกต้อง หรือไม่พบรายละเอียดการโอนเงินของธนาคาร"
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
            ? `Transfer amount (${detectedAmount.toFixed(2)}) does not match required price (${expectedAmount.toFixed(2)})`
            : `ยอดเงินในสลิป (${detectedAmount.toFixed(2)}) ไม่ตรงกับยอดที่กำหนด (${expectedAmount.toFixed(2)})`,
          detectedAmount,
          expectedAmount,
          qrData,
          ocrText
        };
      }
    } else {
      console.warn(`Could not extract exact amount from slip. Proceeding with verified slip format.`);
    }
  }

  let ref = qrData ? parseQRRefNumber(qrData) : null;
  if (!ref && ocrText) {
    ref = parseOCRRefNumber(ocrText);
  }

  return {
    isValid: true,
    reason: detectedAmount
      ? (isEn ? `Bank transfer verified (฿${detectedAmount.toFixed(2)})` : `ยืนยันสลิปโอนเงินสำเร็จ (฿${detectedAmount.toFixed(2)})`)
      : (isEn ? "Bank transfer verified successfully" : "ยืนยันสลิปโอนเงินสำเร็จ"),
    detectedAmount,
    qrData,
    ref,
    imageHash,
    ocrText
  };
}

function scanQRFromImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imageHash = computeCanvasHash(canvas);

        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          
          if (
            code &&
            code.data &&
            (code.data.startsWith("00") ||
             code.data.includes("000201") ||
             code.data.includes("000202") ||
             code.data.includes("00020") ||
             code.data.includes("A000000677"))
          ) {
            resolve({
              isValid: true,
              reason: "Valid Thai Bank Transfer Slip QR detected!",
              qrData: code.data,
              imageHash
            });
            return;
          }

          resolve({ isValid: false, reason: "No valid bank QR code detected.", imageHash });
        } catch (err) {
          console.error("Slip QR validation error:", err);
          resolve({ isValid: false, reason: "Unable to process slip image.", imageHash });
        }
      };
      img.onerror = () => resolve({ isValid: false, reason: "Failed to load image." });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ isValid: false, reason: "Failed to read file." });
    reader.readAsDataURL(file);
  });
}

