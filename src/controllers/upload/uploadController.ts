import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';

// Cliente Supabase só para Storage de imagens (usa SUPABASE_IMAGES_BUCKET_*; não usa SUPABASE_API_KEY do banco)
const hasImagesBucketConfig =
  !!config.supabase.projectUrl &&
  !!config.imagesBucket.apiKey;

const supabaseStorage =
  hasImagesBucketConfig
    ? createClient(config.supabase.projectUrl, config.imagesBucket.apiKey)
    : null;

export const uploadProviderImage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!hasImagesBucketConfig || !supabaseStorage) {
      sendError(res, 'Supabase Storage (imagens) is not configured', 500);
      return;
    }

    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    if (!req.file.mimetype.startsWith('image/')) {
      sendError(res, 'File must be an image', 400);
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    // Bucket genérico com subpastas por domínio (providers, products, etc.)
    const bucket = config.imagesBucket.name || 'images';
    const extension = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `providers/${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabaseStorage.storage
      .from(bucket)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabaseStorage.storage.from(bucket).getPublicUrl(fileName);

    if (!publicUrl) {
      throw new Error('Could not get public URL for uploaded image');
    }

    sendSuccess(
      res,
      {
        url: publicUrl,
        path: fileName,
      },
      'Image uploaded successfully',
      201
    );
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[Upload] Error uploading provider image:', error);
    sendError(res, 'Error uploading image', 500, error?.message);
  }
}

