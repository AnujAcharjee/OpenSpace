/**
 * Client-side utility for optimizing images before upload.
 * It crops the image to a perfect center square and compresses it to AVIF (with WebP and JPEG fallbacks)
 * to ensure extremely small file size (less MB) and high loading speed.
 */
export async function optimizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');

        // High density square avatar size
        const targetSize = 400;
        const width = img.width;
        const height = img.height;

        // Perform center crop
        const size = Math.min(width, height);
        const xOffset = (width - size) / 2;
        const yOffset = (height - size) / 2;

        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        // Enable high-quality image scaling on canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw cropped source to square target
        ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, targetSize, targetSize);

        // Sequence of image mime types to try: AVIF -> WebP -> JPEG
        const formats = ['image/avif', 'image/webp', 'image/jpeg'];
        let formatIndex = 0;

        const attemptExport = () => {
          if (formatIndex >= formats.length) {
            reject(new Error('Failed to compress image in any supported browser format'));
            return;
          }

          const currentFormat = formats[formatIndex];

          canvas.toBlob(
            (blob) => {
              if (blob) {
                if (blob.type === currentFormat || formatIndex === formats.length - 1) {
                  resolve(blob);
                } else {
                  formatIndex++;
                  attemptExport();
                }
              } else {
                formatIndex++;
                attemptExport();
              }
            },
            currentFormat,
            0.85
          );
        };

        attemptExport();
      };

      img.onerror = () => reject(new Error('Failed to parse selected image file'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
