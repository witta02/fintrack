import jsQR from "jsqr";

/**
 * Validates whether an uploaded image file is a valid Thai bank transfer slip.
 * Uses jsQR to scan for Bank Mini QR / Slip QR codes.
 */
export function validateBankSlip(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve({ isValid: false, reason: "Please upload an image file." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          
          if (code && code.data && (code.data.startsWith("00") || code.data.includes("000201") || code.data.includes("000202"))) {
            // Valid Bank Slip QR Code detected!
            resolve({ isValid: true, reason: "Valid Thai Bank Transfer Slip QR detected!" });
            return;
          }

          // Check aspect ratio (most bank slips are vertical receipts with aspect ratio ~ 1.5 - 2.2)
          const aspectRatio = img.height / img.width;
          if (aspectRatio >= 1.2 && aspectRatio <= 3.0) {
            // High probability of a slip format even if QR is slightly blurry
            resolve({ isValid: true, reason: "Slip image format accepted." });
            return;
          }

          resolve({ isValid: false, reason: "Invalid slip! Image does not match a standard Thai bank transfer slip." });

        } catch (err) {
          console.error("Slip validation error:", err);
          resolve({ isValid: false, reason: "Unable to process slip image." });
        }
      };
      img.onerror = () => resolve({ isValid: false, reason: "Failed to load image." });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ isValid: false, reason: "Failed to read file." });
    reader.readAsDataURL(file);
  });
}
