import axios from 'axios';

export interface ChatAttachment {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'IMAGE' | 'PDF' | 'FILE';
  width?: number;
  height?: number;
  format?: string;
}

export function getCloudinaryConfig() {
  const cloudinaryUrl = process.env.NEXT_PUBLIC_CLOUDINARY_URL;
  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() || 'collab_avatars';

  if (cloudinaryUrl) {
    const parts = cloudinaryUrl.split('@');
    if (parts.length > 1) {
      cloudName = parts[parts.length - 1].trim();
    }
  }

  if (!cloudName) {
    throw new Error(
      'Cloudinary is not configured. Please define NEXT_PUBLIC_CLOUDINARY_URL or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in your apps/web/.env file.'
    );
  }

  return { cloudName, uploadPreset };
}

/**
 * Uploads a compressed image blob directly to Cloudinary from the client browser.
 * Uses Cloudinary's Unsigned Upload Flow to securely upload without exposing account credentials.
 */
export async function uploadToCloudinary(blob: Blob): Promise<string> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  const formData = new FormData();
  
  // Choose correct extension based on image blob type
  let extension = 'jpg';
  if (blob.type === 'image/avif') extension = 'avif';
  else if (blob.type === 'image/webp') extension = 'webp';

  formData.append('file', blob, `avatar.${extension}`);
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.data || !response.data.secure_url) {
      throw new Error('Failed to parse a valid URL from Cloudinary upload response');
    }

    return response.data.secure_url;
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    if (axios.isAxiosError(error) && error.response?.data) {
      const apiError = error.response.data.error?.message || JSON.stringify(error.response.data);
      throw new Error(`Cloudinary API Error: ${apiError}`);
    }
    throw new Error(error.message || 'Failed to upload image to Cloudinary');
  }
}

/**
 * Uploads an image or PDF file to Cloudinary for chat messages.
 * Automatically classifies type and retrieves dimensions/metadata.
 */
export async function uploadChatAttachment(
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<ChatAttachment> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/');

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );

    const data = response.data;
    if (!data || !data.secure_url) {
      throw new Error('Cloudinary response did not contain a valid secure URL');
    }

    const attachmentType: 'IMAGE' | 'PDF' | 'FILE' = isImage
      ? 'IMAGE'
      : isPdf
        ? 'PDF'
        : 'FILE';

    return {
      id: data.public_id || crypto.randomUUID(),
      url: data.secure_url,
      name: file.name,
      size: data.bytes || file.size,
      mimeType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
      type: attachmentType,
      width: data.width,
      height: data.height,
      format: data.format,
    };
  } catch (error: any) {
    console.error('Cloudinary chat attachment upload error:', error);
    if (axios.isAxiosError(error) && error.response?.data) {
      const apiError = error.response.data.error?.message || JSON.stringify(error.response.data);
      throw new Error(`Upload failed: ${apiError}`);
    }
    throw new Error(error.message || 'Failed to upload attachment');
  }
}
