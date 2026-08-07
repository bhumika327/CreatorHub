import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../common/config/env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

export class MediaService {
  /**
   * Uploads a base64 image string to Cloudinary
   * @param base64Data Base64 image string (e.g., "data:image/png;base64,...")
   * @param folder Folder name in Cloudinary
   */
  public static async uploadImage(base64Data: string, folder: string = 'creatorhub'): Promise<string> {
    try {
      const uploadResult = await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: 'auto'
      });
      return uploadResult.secure_url;
    } catch (error) {
      console.error('[MediaService] Cloudinary upload failed:', error);
      throw { status: 500, message: 'Media upload failed' };
    }
  }
}
