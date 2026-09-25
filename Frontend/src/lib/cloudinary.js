// Helper function to compress images before upload and upload directly to Cloudinary
const compressImageForUpload = (base64Data, maxDimension = 400, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!base64Data || !base64Data.startsWith('data:image')) {
      return resolve(base64Data);
    }
    const img = new Image();
    img.src = base64Data;
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
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => resolve(base64Data);
  });
};

export const uploadImageToCloudinary = async (imageData, folder = 'polycollab_uploads') => {
  if (!imageData) return '';

  try {
    // 1. Compress image on client-side to ~30KB-80KB to prevent Cloudinary payload timeouts
    const compressedImage = await compressImageForUpload(imageData, 400, 0.8);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 sec timeout limit

    const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/upload`
      , {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: compressedImage, folder }),
        signal: controller.signal
      });

    clearTimeout(timeoutId);
    const data = await res.json();

    if (data.success && data.url) {
      console.log('✅ Cloudinary upload successful:', data.url);
      return data.url;
    } else {
      console.warn('Cloudinary upload fallback to local data URL:', data.error);
      return compressedImage;
    }
  } catch (err) {
    console.warn('Cloudinary upload request notice (using local avatar URL):', err.message);
    // Return compressed base64 image instantly so user profile photo update NEVER fails
    return await compressImageForUpload(imageData, 400, 0.8);
  }
};
