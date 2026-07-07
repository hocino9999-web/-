/**
 * Utility functions for the application
 */

/**
 * Converts a Google Drive sharing URL (web page link) to a direct image stream link.
 * Supports various formats like:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://docs.google.com/file/d/FILE_ID/edit
 * 
 * If the URL is already direct or not a Google Drive link, it returns it as-is.
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // If it's not a Google Drive/Docs link, return it as-is
  if (!trimmed.includes('drive.google.com') && !trimmed.includes('docs.google.com') && !trimmed.includes('googleusercontent.com')) {
    return trimmed;
  }

  // Regular expressions to extract the file ID
  const fileIdRegexes = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/
  ];

  for (const regex of fileIdRegexes) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const fileId = match[1];
      return `/api/drive-image?id=${fileId}`;
    }
  }

  return trimmed;
}

/**
 * Reads an image File, resizes it if it exceeds maxDimensions (e.g., 1024px),
 * and compresses it to a JPEG base64 string to keep it lightweight for storage (under 300KB).
 */
export function compressAndResizeImage(file: File, maxDimension = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('請上傳正確的圖片檔案 (PNG, JPG, 或 JPEG)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('無法初始化畫布繪圖環境'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG format (supports resizing and high compression)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('圖片載入失敗，檔案可能已損壞'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('讀取檔案時發生錯誤'));
    };
    reader.readAsDataURL(file);
  });
}

